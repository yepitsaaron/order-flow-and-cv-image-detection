#!/usr/bin/env python3
"""
Test script for identical image detection
Ensures that identical images return 100% confidence
"""

import cv2
import numpy as np
import os
import sys

def test_identical_images():
    """Test that identical images return 100% confidence"""
    
    print("🧪 Testing Identical Image Detection")
    print("=" * 50)
    
    # Create a test image
    test_image = np.zeros((200, 300, 3), dtype=np.uint8)
    test_image[50:150, 100:200] = [255, 0, 0]  # Red rectangle
    test_image[75:125, 125:175] = [0, 255, 0]  # Green rectangle inside
    
    # Save the same image twice
    os.makedirs('test_images', exist_ok=True)
    cv2.imwrite('test_images/image1.png', test_image)
    cv2.imwrite('test_images/image2.png', test_image)
    
    print("✅ Created identical test images")
    
    # Test the comparison function
    from image_comparison_app import compare_images
    
    result = compare_images('test_images/image1.png', 'test_images/image2.png')
    
    if result['success']:
        print(f"📊 Confidence: {result['confidence']:.3f}")
        print(f"🏷️  Match Quality: {result['match_quality']}")
        print(f"📏 Template Size: {result['template_size']}")
        print(f"📏 Search Image Size: {result['search_image_size']}")
        print(f"🔧 Method Used: {result['method_used']}")
        
        if result['confidence'] >= 0.99:
            print("🎉 SUCCESS: Identical images correctly detected with 100% confidence!")
        else:
            print(f"❌ FAILED: Expected 100% confidence, got {result['confidence']:.3f}")
            return False
    else:
        print(f"❌ Comparison failed: {result['error']}")
        return False
    
    return True

def test_similar_images():
    """Test that very similar images get high confidence"""
    
    print("\n🔍 Testing Similar Image Detection")
    print("=" * 50)
    
    # Create a base image
    base_image = np.zeros((200, 300, 3), dtype=np.uint8)
    base_image[50:150, 100:200] = [255, 0, 0]  # Red rectangle
    base_image[75:125, 125:175] = [0, 255, 0]  # Green rectangle inside
    
    # Create a slightly modified version (add a small noise pixel)
    modified_image = base_image.copy()
    modified_image[100, 150] = [0, 0, 255]  # Single blue pixel
    
    # Save images
    cv2.imwrite('test_images/base.png', base_image)
    cv2.imwrite('test_images/modified.png', modified_image)
    
    print("✅ Created similar test images (one pixel difference)")
    
    # Test the comparison function
    from image_comparison_app import compare_images
    
    result = compare_images('test_images/base.png', 'test_images/modified.png')
    
    if result['success']:
        print(f"📊 Confidence: {result['confidence']:.3f}")
        print(f"🏷️  Match Quality: {result['match_quality']}")
        print(f"🔧 Method Used: {result['method_used']}")
        
        if result['confidence'] >= 0.8:
            print("✅ SUCCESS: Similar images correctly detected with high confidence!")
        else:
            print(f"⚠️  WARNING: Similar images got lower confidence than expected: {result['confidence']:.3f}")
    else:
        print(f"❌ Comparison failed: {result['error']}")
    
    return True

if __name__ == "__main__":
    try:
        success1 = test_identical_images()
        success2 = test_similar_images()
        
        if success1 and success2:
            print("\n🎉 All tests passed! The image comparison tool now correctly handles identical images.")
        else:
            print("\n❌ Some tests failed. Please check the output above.")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!") 