#!/usr/bin/env python3
"""
Test script for the image comparison functionality
Tests the core OpenCV template matching without the web interface
"""

import cv2
import numpy as np
import os
import sys

def test_image_comparison():
    """Test the image comparison function with sample images"""
    
    # Check if we have test images in the fixtures directory
    fixtures_dir = "../__tests__/fixtures/images"
    
    if not os.path.exists(fixtures_dir):
        print("❌ Test fixtures directory not found. Creating sample test images...")
        create_sample_test_images()
        return
    
    # Look for test images
    test_images = []
    for root, dirs, files in os.walk(fixtures_dir):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                test_images.append(os.path.join(root, file))
    
    if len(test_images) < 2:
        print("❌ Need at least 2 test images. Creating sample test images...")
        create_sample_test_images()
        return
    
    print(f"✅ Found {len(test_images)} test images")
    
    # Test with first two images
    template_path = test_images[0]
    search_path = test_images[1]
    
    print(f"🔍 Template image: {os.path.basename(template_path)}")
    print(f"🔍 Search image: {os.path.basename(search_path)}")
    
    # Test the comparison function
    result = compare_images(template_path, search_path)
    
    if result['success']:
        print("✅ Image comparison successful!")
        print(f"📊 Confidence: {result['confidence']:.3f}")
        print(f"🏷️  Match Quality: {result['match_quality']}")
        print(f"📏 Template Size: {result['template_size']}")
        print(f"📏 Search Image Size: {result['search_image_size']}")
        print(f"📍 Match Location: {result['match_location']}")
        print(f"📊 Size Ratio: {result['size_ratio']:.2%}")
        
        if result['annotated_image']:
            print(f"🖼️  Annotated image saved: {result['annotated_image']}")
    else:
        print(f"❌ Image comparison failed: {result['error']}")

def create_sample_test_images():
    """Create sample test images for testing"""
    print("Creating sample test images...")
    
    # Create a simple template image (smaller)
    template = np.zeros((100, 100, 3), dtype=np.uint8)
    template[20:80, 20:80] = [255, 0, 0]  # Red square
    
    # Create a larger search image containing the template
    search_image = np.zeros((300, 400, 3), dtype=np.uint8)
    search_image[50:150, 100:200] = [255, 0, 0]  # Red square at position (100, 50)
    
    # Add some noise and other shapes
    search_image[200:250, 50:100] = [0, 255, 0]  # Green rectangle
    search_image[250:300, 300:350] = [0, 0, 255]  # Blue rectangle
    
    # Save images
    os.makedirs('test_images', exist_ok=True)
    cv2.imwrite('test_images/template.png', template)
    cv2.imwrite('test_images/search_image.png', search_image)
    
    print("✅ Sample test images created in 'test_images/' directory")
    print("🔍 Template: test_images/template.png")
    print("🔍 Search: test_images/search_image.png")
    
    # Test with these images
    result = compare_images('test_images/template.png', 'test_images/search_image.png')
    
    if result['success']:
        print("✅ Test with sample images successful!")
        print(f"📊 Confidence: {result['confidence']:.3f}")
        print(f"🏷️  Match Quality: {result['match_quality']}")
    else:
        print(f"❌ Test with sample images failed: {result['error']}")

def compare_images(template_path, search_image_path):
    """
    Compare two images using OpenCV template matching
    Returns confidence score and match information
    """
    try:
        # Read images
        template = cv2.imread(template_path)
        search_image = cv2.imread(search_image_path)
        
        if template is None or search_image is None:
            return {
                'success': False,
                'error': 'Failed to read one or both images'
            }
        
        # Convert to grayscale for better matching
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        search_gray = cv2.cvtColor(search_image, cv2.COLOR_BGR2GRAY)
        
        # Get template dimensions
        h, w = template_gray.shape
        
        # Use multiple template matching methods for better accuracy
        methods = [
            cv2.TM_CCOEFF_NORMED,      # Best for most cases
            cv2.TM_CCORR_NORMED,       # Good for similar lighting
            cv2.TM_SQDIFF_NORMED       # Good for exact matches
        ]
        
        best_match = None
        best_confidence = 0
        best_method = None
        best_location = None
        
        for method in methods:
            # Apply template matching
            result = cv2.matchTemplate(search_gray, template_gray, method)
            
            # Get the best match location
            if method == cv2.TM_SQDIFF_NORMED:
                # For SQDIFF, minimum value is best
                min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
                confidence = 1.0 - min_val  # Convert to confidence score
                match_loc = min_loc
            else:
                # For other methods, maximum value is best
                min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
                confidence = max_val
                match_loc = max_loc
            
            # Update best match if this method gives better confidence
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = result
                best_method = method
                best_location = match_loc
        
        # Calculate additional metrics for confidence
        confidence_score = best_confidence
        
        # Check if template size is reasonable compared to search image
        search_h, search_w = search_gray.shape
        size_ratio = (h * w) / (search_h * search_w)
        
        # Adjust confidence based on size ratio (template shouldn't be too large)
        if size_ratio > 0.8:
            confidence_score *= 0.5  # Penalize if template is almost as large as search image
        elif size_ratio < 0.01:
            confidence_score *= 0.8  # Slight penalty for very small templates
        
        # Determine match quality
        if confidence_score >= 0.8:
            match_quality = "Excellent Match"
        elif confidence_score >= 0.6:
            match_quality = "Good Match"
        elif confidence_score >= 0.4:
            match_quality = "Moderate Match"
        elif confidence_score >= 0.2:
            match_quality = "Weak Match"
        else:
            match_quality = "No Significant Match"
        
        return {
            'success': True,
            'confidence': confidence_score,
            'match_quality': match_quality,
            'template_size': (w, h),
            'search_image_size': (search_w, search_h),
            'match_location': best_location,
            'method_used': str(best_method),
            'size_ratio': size_ratio
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    print("🧪 Testing Image Comparison Functionality")
    print("=" * 50)
    
    try:
        test_image_comparison()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!") 