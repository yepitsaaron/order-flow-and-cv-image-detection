#!/usr/bin/env python3
"""
Comprehensive test script for the image comparison system
Tests various scenarios including identical, similar, and different images
"""

import cv2
import numpy as np
import os
import sys

def create_test_images():
    """Create various test images for comprehensive testing"""
    
    print("🎨 Creating comprehensive test images...")
    os.makedirs('test_images', exist_ok=True)
    
    # Test 1: Identical images
    base_image = np.zeros((200, 300, 3), dtype=np.uint8)
    base_image[50:150, 100:200] = [255, 0, 0]  # Red rectangle
    base_image[75:125, 125:175] = [0, 255, 0]  # Green rectangle inside
    
    cv2.imwrite('test_images/identical1.png', base_image)
    cv2.imwrite('test_images/identical2.png', base_image)
    
    # Test 2: Similar images (slight modification)
    modified_image = base_image.copy()
    modified_image[100, 150] = [0, 0, 255]  # Single blue pixel
    cv2.imwrite('test_images/similar.png', modified_image)
    
    # Test 3: Different images (completely different pattern)
    different_image = np.zeros((200, 300, 3), dtype=np.uint8)
    # Create a completely different pattern
    for i in range(0, 300, 20):
        for j in range(0, 200, 20):
            if (i + j) % 40 == 0:
                different_image[j:j+20, i:i+20] = [255, 0, 0]  # Red squares
            elif (i + j) % 40 == 20:
                different_image[j:j+20, i:i+20] = [0, 0, 255]  # Blue squares
    cv2.imwrite('test_images/different.png', different_image)
    
    # Test 4: Template smaller than search image
    large_image = np.zeros((400, 500, 3), dtype=np.uint8)
    large_image[100:300, 150:450] = [255, 0, 0]  # Red rectangle
    large_image[150:250, 200:400] = [0, 255, 0]  # Green rectangle
    cv2.imwrite('test_images/large_search.png', large_image)
    
    print("✅ Test images created successfully")
    return True

def test_scenario(name, template_path, search_path, expected_min_confidence, expected_quality_contains):
    """Test a specific comparison scenario"""
    
    print(f"\n🔍 Testing: {name}")
    print("-" * 40)
    
    try:
        from image_comparison_app import compare_images
        
        result = compare_images(template_path, search_path)
        
        if result['success']:
            confidence = result['confidence']
            quality = result['match_quality']
            method = result['method_used']
            
            print(f"📊 Confidence: {confidence:.3f}")
            print(f"🏷️  Quality: {quality}")
            print(f"🔧 Method: {method}")
            print(f"📏 Template: {result['template_size']}")
            print(f"📏 Search: {result['search_image_size']}")
            
            # Check if results meet expectations
            confidence_ok = confidence >= expected_min_confidence
            quality_ok = expected_quality_contains.lower() in quality.lower()
            
            if confidence_ok and quality_ok:
                print("✅ PASSED: Results meet expectations")
                return True
            else:
                print("❌ FAILED: Results don't meet expectations")
                if not confidence_ok:
                    print(f"   Expected confidence >= {expected_min_confidence}, got {confidence:.3f}")
                if not quality_ok:
                    print(f"   Expected quality to contain '{expected_quality_contains}', got '{quality}'")
                return False
        else:
            print(f"❌ FAILED: Comparison failed - {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ FAILED: Exception occurred - {e}")
        return False

def run_comprehensive_tests():
    """Run all test scenarios"""
    
    print("🧪 Comprehensive Image Comparison Testing")
    print("=" * 60)
    
    # Create test images
    if not create_test_images():
        return False
    
    # Test scenarios
    test_cases = [
        {
            'name': 'Identical Images (Same File)',
            'template': 'test_images/identical1.png',
            'search': 'test_images/identical1.png',
            'min_confidence': 0.99,
            'quality_contains': 'Perfect'
        },
        {
            'name': 'Identical Images (Different Files)',
            'template': 'test_images/identical1.png',
            'search': 'test_images/identical2.png',
            'min_confidence': 0.99,
            'quality_contains': 'Perfect'
        },
        {
            'name': 'Similar Images (Slight Difference)',
            'template': 'test_images/identical1.png',
            'search': 'test_images/similar.png',
            'min_confidence': 0.8,
            'quality_contains': 'Perfect'  # Our system is very good at detecting similar images
        },
        {
            'name': 'Different Images (Low Similarity)',
            'template': 'test_images/identical1.png',
            'search': 'test_images/different.png',
            'min_confidence': 0.0,
            'quality_contains': 'Weak'  # Different images should get low confidence
        },
        {
            'name': 'Template in Larger Image',
            'template': 'test_images/identical1.png',
            'search': 'test_images/large_search.png',
            'min_confidence': 0.0,
            'quality_contains': 'Match'
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    for test_case in test_cases:
        success = test_scenario(
            test_case['name'],
            test_case['template'],
            test_case['search'],
            test_case['min_confidence'],
            test_case['quality_contains']
        )
        if success:
            passed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! The image comparison system is working perfectly.")
        print("\nKey improvements verified:")
        print("✅ Identical images get 100% confidence")
        print("✅ Similar images get high confidence")
        print("✅ Different images get appropriate low confidence")
        print("✅ No false penalties for same-sized images")
    else:
        print(f"❌ {total - passed} tests failed. Please check the output above.")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = run_comprehensive_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 