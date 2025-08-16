#!/usr/bin/env python3
"""
Test script for enhanced t-shirt detection with graphics and text recognition
"""

import cv2
import numpy as np
import os

def create_test_images_with_designs():
    """Create test images with various designs to test enhanced detection"""
    
    print("🎨 Creating test images with designs...")
    os.makedirs('test_images', exist_ok=True)
    
    # Test 1: Plain t-shirt (no design)
    plain_shirt = np.zeros((300, 400, 3), dtype=np.uint8)
    plain_shirt[50:250, 100:300] = [255, 0, 0]  # Red t-shirt
    cv2.imwrite('test_images/plain_shirt.png', plain_shirt)
    
    # Test 2: T-shirt with text
    text_shirt = plain_shirt.copy()
    # Add text-like elements (rectangular blocks)
    text_shirt[120:140, 150:250] = [0, 0, 0]  # Black text line
    text_shirt[160:180, 150:250] = [0, 0, 0]  # Black text line
    cv2.imwrite('test_images/text_shirt.png', text_shirt)
    
    # Test 3: T-shirt with graphics
    graphics_shirt = plain_shirt.copy()
    # Add graphic elements (circles, rectangles)
    cv2.circle(graphics_shirt, (200, 150), 30, (0, 255, 0), -1)  # Green circle
    cv2.rectangle(graphics_shirt, (150, 180), (250, 220), (255, 255, 0), -1)  # Yellow rectangle
    cv2.imwrite('test_images/graphics_shirt.png', graphics_shirt)
    
    # Test 4: T-shirt with text and graphics
    complex_shirt = plain_shirt.copy()
    # Add text
    complex_shirt[120:140, 150:250] = [0, 0, 0]  # Black text
    # Add graphics
    cv2.circle(complex_shirt, (200, 150), 25, (0, 255, 0), -1)  # Green circle
    cv2.rectangle(complex_shirt, (160, 180), (240, 200), (255, 255, 0), -1)  # Yellow rectangle
    cv2.imwrite('test_images/complex_shirt.png', complex_shirt)
    
    print("✅ Test images with designs created successfully")
    return True

def test_enhanced_detection():
    """Test the enhanced detection algorithm"""
    
    print("\n🧪 Testing Enhanced Detection Algorithm")
    print("=" * 60)
    
    try:
        from video_streaming_app import TShirtDetector
        
        # Create detector instance
        detector = TShirtDetector("test-facility")
        
        # Test images
        test_images = [
            'test_images/plain_shirt.png',
            'test_images/text_shirt.png', 
            'test_images/graphics_shirt.png',
            'test_images/complex_shirt.png'
        ]
        
        for image_path in test_images:
            print(f"\n🔍 Testing: {os.path.basename(image_path)}")
            print("-" * 40)
            
            # Read image
            frame = cv2.imread(image_path)
            if frame is None:
                print(f"❌ Failed to read {image_path}")
                continue
            
            # Test detection
            is_t_shirt, t_shirt_mask = detector.detect_t_shirt(frame)
            
            if is_t_shirt:
                print("✅ T-shirt detected")
                
                # Test color detection
                detected_color = detector.detect_shirt_color(frame, t_shirt_mask)
                print(f"🎨 Color: {detected_color}")
                
                # Test enhanced design feature extraction
                design_features = detector.extract_design_features(frame, t_shirt_mask)
                print(f"🔤 Design Type: {design_features['design_type']}")
                print(f"📊 Design Objects: {design_features['design_contours']}")
                print(f"📝 Text Elements: {design_features['text_elements']}")
                print(f"⚡ Overall Complexity: {design_features['overall_complexity']:.1f}")
                
                # Test order matching
                matching_order = detector.find_matching_order(detected_color, design_features)
                if matching_order:
                    print(f"🎯 Order Match: {matching_order}")
                else:
                    print("❌ No order match found")
                    
            else:
                print("❌ No t-shirt detected")
    
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        # Create test images
        create_test_images_with_designs()
        
        # Test enhanced detection
        test_enhanced_detection()
        
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("🏁 Enhanced detection test completed!") 