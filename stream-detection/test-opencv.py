#!/usr/bin/env python3
"""
Simple test script to verify OpenCV installation and basic functionality
"""

import sys

def test_imports():
    """Test if required packages can be imported"""
    try:
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
    except ImportError as e:
        print(f"❌ OpenCV import failed: {e}")
        return False
    
    try:
        import numpy as np
        print(f"✅ NumPy version: {np.__version__}")
    except ImportError as e:
        print(f"❌ NumPy import failed: {e}")
        return False
    
    try:
        import requests
        print(f"✅ Requests version: {requests.__version__}")
    except ImportError as e:
        print(f"❌ Requests import failed: {e}")
        return False
    
    return True

def test_camera():
    """Test if camera can be accessed"""
    try:
        import cv2
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            print("✅ Camera access successful")
            ret, frame = cap.read()
            if ret:
                print(f"✅ Frame capture successful: {frame.shape}")
            else:
                print("⚠️  Frame capture failed")
            cap.release()
        else:
            print("⚠️  Camera not accessible (may be in use by another application)")
    except Exception as e:
        print(f"❌ Camera test failed: {e}")

def test_basic_opencv():
    """Test basic OpenCV functionality"""
    try:
        import cv2
        import numpy as np
        
        # Create a test image
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        test_image[:] = (255, 0, 0)  # Blue color
        
        # Test basic operations
        gray = cv2.cvtColor(test_image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        print("✅ Basic OpenCV operations successful")
        print(f"   - Image shape: {test_image.shape}")
        print(f"   - Grayscale shape: {gray.shape}")
        print(f"   - Blurred shape: {blurred.shape}")
        
    except Exception as e:
        print(f"❌ Basic OpenCV test failed: {e}")

def main():
    print("🧪 Testing OpenCV Installation and Functionality")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("\n❌ Required packages not available. Please install them first:")
        print("   pip install opencv-python numpy requests")
        return
    
    print("\n" + "=" * 50)
    
    # Test basic functionality
    test_basic_opencv()
    
    print("\n" + "=" * 50)
    
    # Test camera
    test_camera()
    
    print("\n" + "=" * 50)
    print("✅ All tests completed!")

if __name__ == "__main__":
    main() 