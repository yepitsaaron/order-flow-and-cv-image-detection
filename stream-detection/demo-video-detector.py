#!/usr/bin/env python3
"""
Demo script for the T-shirt Detection System
This script demonstrates the functionality without requiring camera access
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from video_streaming_app import TShirtDetector
import cv2
import numpy as np

def create_demo_image():
    """Create a demo image with a t-shirt-like object"""
    # Create a 640x480 image
    image = np.ones((480, 640, 3), dtype=np.uint8) * 255  # White background
    
    # Draw a blue rectangle (simulating a blue t-shirt)
    cv2.rectangle(image, (150, 100), (490, 380), (255, 0, 0), -1)  # Blue t-shirt
    
    # Add some design elements (simulating a logo)
    cv2.circle(image, (320, 240), 50, (0, 255, 255), -1)  # Yellow circle logo
    cv2.putText(image, "LOGO", (300, 245), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    # Add some text
    cv2.putText(image, "Demo T-Shirt Image", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    
    return image

def demo_detection():
    """Demonstrate the detection functionality"""
    print("🧪 T-Shirt Detection System Demo")
    print("=" * 50)
    
    # Create demo detector
    detector = TShirtDetector("demo-facility")
    
    # Create demo image
    demo_image = create_demo_image()
    
    print("✅ Created demo image with blue t-shirt and logo")
    
    # Test t-shirt detection
    print("\n🔍 Testing T-shirt Detection...")
    is_t_shirt, t_shirt_mask = detector.detect_t_shirt(demo_image)
    
    if is_t_shirt:
        print("✅ T-shirt detected successfully!")
        
        # Test color detection
        print("\n🎨 Testing Color Detection...")
        detected_color = detector.detect_shirt_color(demo_image, t_shirt_mask)
        print(f"   Detected color: {detected_color}")
        
        # Test design feature extraction
        print("\n🖼️  Testing Design Feature Extraction...")
        design_features = detector.extract_design_features(demo_image, t_shirt_mask)
        print(f"   Feature count: {design_features['feature_count']}")
        print(f"   Average descriptor: {'Available' if design_features['avg_descriptor'] else 'None'}")
        
        # Test order matching (with mock data)
        print("\n🔗 Testing Order Matching...")
        detector.pending_orders = [
            {
                'orderItemId': 1,
                'orderNumber': 'DEMO-001',
                'color': 'blue',
                'designImage': 'demo-design.png',
                'quantity': 1
            }
        ]
        
        matching_order = detector.find_matching_order(detected_color, design_features)
        if matching_order:
            print(f"   ✅ Match found: Order #{matching_order['orderNumber']}")
        else:
            print("   ❌ No matching order found")
        
        # Draw results on image
        detector.draw_detection_results(demo_image, t_shirt_mask, detected_color, matching_order)
        
        # Save result
        output_path = "demo-detection-result.jpg"
        cv2.imwrite(output_path, demo_image)
        print(f"\n💾 Detection result saved to: {output_path}")
        
    else:
        print("❌ T-shirt detection failed")
    
    print("\n" + "=" * 50)
    print("✅ Demo completed successfully!")

def main():
    """Main demo function"""
    try:
        demo_detection()
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 