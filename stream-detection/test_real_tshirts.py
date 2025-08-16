#!/usr/bin/env python3
"""
Real T-shirt Detection Test using actual examples from test_image_gt
This script uses real t-shirt images to improve detection accuracy and thresholds
"""

import cv2
import numpy as np
import os
import json
from datetime import datetime

def analyze_real_tshirt_examples():
    """Analyze real t-shirt examples to improve detection parameters"""
    
    print("🎯 Analyzing Real T-shirt Examples for Detection Improvement")
    print("=" * 70)
    
    # Define expected characteristics for each image
    expected_results = {
        # Original test examples
        'tshirt_plain.jpg': {
            'color': 'unknown',  # Will be detected
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'tshirt_with_graphic.png': {
            'color': 'unknown',
            'design_type': 'Graphics Only',
            'expected_objects': '>3',
            'expected_text': 0,
            'expected_complexity': 'medium'
        },
        'tshirt_with_text_and_logo.jpg': {
            'color': 'unknown',
            'design_type': 'Text with Graphics',
            'expected_objects': '>2',
            'expected_text': '>3',
            'expected_complexity': 'high'
        },
        'tshirt_yellow_with_text_and_logo.jpg': {
            'color': 'yellow',
            'design_type': 'Text with Graphics',
            'expected_objects': '>2',
            'expected_text': '>3',
            'expected_complexity': 'high'
        },
        'tshirt_red_with_text_and_logo.jpg': {
            'color': 'red',
            'design_type': 'Text with Graphics',
            'expected_objects': '>2',
            'expected_text': '>3',
            'expected_complexity': 'high'
        },
        # New plain t-shirt examples
        'tshirt_plain_orange.jpg': {
            'color': 'orange',  # Should detect as orange or red
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'tshirt_plain_green.jpg': {
            'color': 'green',  # Should detect as green
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        # Production blank examples (various colors and sizes)
        'i_m_bi_production_blanks_mtl53ofohwq5goqjo9ke_1462829015,c_38_0_395x,s_630,q_90.jpg': {
            'color': 'unknown',  # Color 38 - likely dark color
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'i_m_bi_production_blanks_eabj4jnnotiueowzmy6k_1462829019,c_38_0_395x,s_630,q_90.jpg': {
            'color': 'unknown',  # Color 38 - likely dark color
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'i_m_bi_production_blanks_ekerz3afkzxin2pgqj8h_1462829018,c_33_0_404x,s_630,q_90.jpg': {
            'color': 'unknown',  # Color 33 - likely dark color
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'i_m_bi_production_blanks_h778z1f0n6g0xugjpxxm_1462829020,c_33_0_404x,s_630,q_90.jpg': {
            'color': 'unknown',  # Color 33 - likely dark color
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'i_m_bi_production_blanks_mtl53ofohwq5goqjo9ke_1462829015,c_9_10_451x,s_630,q_90.jpg': {
            'color': 'unknown',  # Color 9 - likely light color
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        },
        'i_m_bi_production_blanks_qe3008lhp5hquxmwp4a0_1462829017,c_35_0_x626,s_630,q_90.jpg': {
            'color': 'unknown',  # Color 35 - likely dark color
            'design_type': 'Plain',
            'expected_objects': 0,
            'expected_text': 0,
            'expected_complexity': 'low'
        }
    }
    
    try:
        from video_streaming_app import TShirtDetector
        
        # Create detector instance
        detector = TShirtDetector("test-facility")
        
        # Results storage
        analysis_results = {}
        
        for filename, expected in expected_results.items():
            image_path = f'test_image_gt/{filename}'
            
            if not os.path.exists(image_path):
                print(f"❌ Image not found: {image_path}")
                continue
                
            print(f"\n🔍 Analyzing: {filename}")
            print("-" * 50)
            
            # Read image
            frame = cv2.imread(image_path)
            if frame is None:
                print(f"❌ Failed to read {image_path}")
                continue
            
            # Get image dimensions
            height, width = frame.shape[:2]
            print(f"📏 Image size: {width}x{height} pixels")
            
            # Test enhanced detection
            is_t_shirt, t_shirt_mask = detector.detect_t_shirt(frame)
            
            if is_t_shirt:
                print("✅ T-shirt detected successfully")
                
                # Calculate detection coverage
                t_shirt_pixels = np.sum(t_shirt_mask > 0)
                total_pixels = frame.shape[0] * frame.shape[1]
                coverage_ratio = t_shirt_pixels / total_pixels
                print(f"📊 Detection coverage: {coverage_ratio:.3f} ({t_shirt_pixels:,} / {total_pixels:,} pixels)")
                
                # Test color detection
                detected_color = detector.detect_shirt_color(frame, t_shirt_mask)
                print(f"🎨 Detected color: {detected_color}")
                print(f"🎯 Expected color: {expected['color']}")
                
                # Test enhanced design feature extraction
                design_features = detector.extract_design_features(frame, t_shirt_mask)
                print(f"🔤 Design Type: {design_features['design_type']}")
                print(f"📊 Design Objects: {design_features['design_contours']}")
                print(f"📝 Text Elements: {design_features['text_elements']}")
                print(f"⚡ Overall Complexity: {design_features['overall_complexity']:.1f}")
                
                # Validate against expectations
                validation_results = validate_detection_results(
                    detected_color, design_features, expected
                )
                
                # Store results
                analysis_results[filename] = {
                    'detection_success': True,
                    'coverage_ratio': coverage_ratio,
                    'detected_color': detected_color,
                    'design_features': design_features,
                    'validation': validation_results
                }
                
                # Test order matching
                matching_order = detector.find_matching_order(detected_color, design_features)
                if matching_order:
                    print(f"🎯 Order Match: {matching_order}")
                else:
                    print("❌ No order match found")
                    
            else:
                print("❌ No t-shirt detected")
                analysis_results[filename] = {
                    'detection_success': False,
                    'error': 'No t-shirt detected'
                }
        
        # Generate improvement recommendations
        print("\n" + "=" * 70)
        print("📈 DETECTION IMPROVEMENT RECOMMENDATIONS")
        print("=" * 70)
        
        generate_improvement_recommendations(analysis_results)
        
        # Save detailed analysis
        save_analysis_report(analysis_results)
        
        return analysis_results
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return None

def validate_detection_results(detected_color, design_features, expected):
    """Validate detection results against expected characteristics"""
    
    validation = {
        'color_match': False,
        'design_type_match': False,
        'objects_match': False,
        'text_match': False,
        'complexity_match': False,
        'overall_score': 0
    }
    
    # Color validation
    if expected['color'] != 'unknown':
        validation['color_match'] = (detected_color == expected['color'])
    else:
        validation['color_match'] = True  # Unknown expected
    
    # Design type validation
    validation['design_type_match'] = (design_features['design_type'] == expected['design_type'])
    
    # Objects validation
    if expected['expected_objects'] == 0:
        validation['objects_match'] = (design_features['design_contours'] == 0)
    elif expected['expected_objects'].startswith('>'):
        min_objects = int(expected['expected_objects'][1:])
        validation['objects_match'] = (design_features['design_contours'] > min_objects)
    
    # Text validation
    if expected['expected_text'] == 0:
        validation['text_match'] = (design_features['text_elements'] == 0)
    elif expected['expected_text'].startswith('>'):
        min_text = int(expected['expected_text'][1:])
        validation['text_match'] = (design_features['text_elements'] > min_text)
    
    # Complexity validation
    complexity = design_features['overall_complexity']
    if expected['expected_complexity'] == 'low':
        validation['complexity_match'] = (complexity < 100)
    elif expected['expected_complexity'] == 'medium':
        validation['complexity_match'] = (50 <= complexity <= 200)
    elif expected['expected_complexity'] == 'high':
        validation['complexity_match'] = (complexity > 150)
    
    # Calculate overall score
    validation['overall_score'] = sum([
        validation['color_match'],
        validation['design_type_match'],
        validation['objects_match'],
        validation['text_match'],
        validation['complexity_match']
    ]) / 5.0
    
    return validation

def generate_improvement_recommendations(analysis_results):
    """Generate specific recommendations for improving detection"""
    
    successful_detections = [r for r in analysis_results.values() if r.get('detection_success', False)]
    
    if not successful_detections:
        print("❌ No successful detections to analyze")
        return
    
    print(f"📊 Analysis of {len(successful_detections)} successful detections:")
    
    # Coverage analysis
    coverages = [r['coverage_ratio'] for r in successful_detections]
    avg_coverage = np.mean(coverages)
    print(f"📏 Average detection coverage: {avg_coverage:.3f}")
    
    # Color detection analysis
    color_accuracy = sum(1 for r in successful_detections if r['validation']['color_match']) / len(successful_detections)
    print(f"🎨 Color detection accuracy: {color_accuracy:.1%}")
    
    # Design type accuracy
    design_accuracy = sum(1 for r in successful_detections if r['validation']['design_type_match']) / len(successful_detections)
    print(f"🔤 Design type accuracy: {design_accuracy:.1%}")
    
    # Overall validation scores
    validation_scores = [r['validation']['overall_score'] for r in successful_detections]
    avg_validation = np.mean(validation_scores)
    print(f"⭐ Overall validation score: {avg_validation:.1%}")
    
    # Specific recommendations
    print("\n🔧 SPECIFIC IMPROVEMENTS NEEDED:")
    
    if avg_coverage < 0.1:
        print("  • Detection coverage is too low - consider lowering area thresholds")
    
    if color_accuracy < 0.8:
        print("  • Color detection needs improvement - review HSV color ranges")
    
    if design_accuracy < 0.8:
        print("  • Design classification needs refinement - adjust feature thresholds")
    
    if avg_validation < 0.7:
        print("  • Overall detection accuracy needs improvement - review multiple parameters")
    
    # Parameter tuning suggestions
    print("\n⚙️ PARAMETER TUNING SUGGESTIONS:")
    
    # Analyze coverage patterns
    low_coverage = [r for r in successful_detections if r['coverage_ratio'] < 0.05]
    if low_coverage:
        print("  • Consider lowering minimum area threshold from 1000 to 500 pixels")
        print("  • Review aspect ratio constraints (currently 0.3-2.5)")
    
    # Analyze complexity patterns
    high_complexity = [r for r in successful_detections if r['design_features']['overall_complexity'] > 500]
    if high_complexity:
        print("  • High complexity detected - consider adjusting edge density scaling")
    
    print("\n✅ RECOMMENDED NEXT STEPS:")
    print("  1. Test with more diverse t-shirt examples")
    print("  2. Fine-tune detection thresholds based on coverage analysis")
    print("  3. Improve color detection with expanded HSV ranges")
    print("  4. Refine design classification thresholds")

def save_analysis_report(analysis_results):
    """Save detailed analysis report to file"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"tshirt_detection_analysis_{timestamp}.json"
    
    # Prepare data for JSON serialization
    serializable_results = {}
    for filename, result in analysis_results.items():
        if result.get('detection_success'):
            # Convert numpy types to Python types
            design_features = result['design_features'].copy()
            if design_features.get('avg_descriptor') is not None:
                # Handle both numpy arrays and lists
                if hasattr(design_features['avg_descriptor'], 'tolist'):
                    design_features['avg_descriptor'] = design_features['avg_descriptor'].tolist()
                # If it's already a list, keep it as is
            
            # Convert validation results to JSON-serializable format
            validation = result['validation'].copy()
            for key, value in validation.items():
                if isinstance(value, bool):
                    validation[key] = int(value)  # Convert bool to int for JSON
                elif isinstance(value, float):
                    validation[key] = float(value)  # Ensure float is serializable
            
            serializable_results[filename] = {
                'detection_success': result['detection_success'],
                'coverage_ratio': float(result['coverage_ratio']),
                'detected_color': result['detected_color'],
                'design_features': design_features,
                'validation': validation
            }
        else:
            serializable_results[filename] = result
    
    with open(report_file, 'w') as f:
        json.dump(serializable_results, f, indent=2)
    
    print(f"\n📄 Detailed analysis report saved to: {report_file}")

if __name__ == "__main__":
    try:
        # Check if test_image_gt directory exists
        if not os.path.exists('test_image_gt'):
            print("❌ test_image_gt directory not found!")
            print("Please ensure the directory exists with real t-shirt examples.")
            exit(1)
        
        # Analyze real t-shirt examples
        results = analyze_real_tshirt_examples()
        
        if results:
            print("\n" + "=" * 70)
            print("🏁 Real T-shirt Detection Analysis Completed!")
            print("=" * 70)
        else:
            print("\n❌ Analysis failed!")
            
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        import traceback
        traceback.print_exc() 