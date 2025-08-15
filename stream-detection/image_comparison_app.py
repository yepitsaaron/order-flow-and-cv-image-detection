#!/usr/bin/env python3
"""
Image Comparison Tool for Stream Detection System
Allows users to upload two images and check if the first can be extracted from the second
using OpenCV template matching with confidence scoring.
"""

import cv2
import numpy as np
import os
import logging
from flask import Flask, render_template, request, jsonify, flash
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
from flask import send_from_directory

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this in production

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_file(file):
    """Save uploaded file and return the file path"""
    if file and allowed_file(file.filename):
        # Generate unique filename to avoid conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{timestamp}_{unique_id}.{extension}"
        
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        logger.info(f"File saved: {filepath}")
        return filepath
    return None

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
        
        # Quick check: If images are exactly the same size, do a direct comparison first
        search_h, search_w = search_gray.shape
        if h == search_h and w == search_w:
            # Direct pixel-by-pixel comparison for identical dimensions
            if np.array_equal(template_gray, search_gray):
                # Images are identical - return 100% confidence
                return {
                    'success': True,
                    'confidence': 1.0,
                    'match_quality': "Perfect Match (Identical Images)",
                    'template_size': (w, h),
                    'search_image_size': (search_w, search_h),
                    'match_location': (0, 0),
                    'annotated_image': None,
                    'method_used': 'Direct Comparison',
                    'size_ratio': 1.0
                }
        
        # Use multiple template matching methods for better accuracy
        # Prioritize methods that work better for exact matches
        methods = [
            cv2.TM_SQDIFF_NORMED,      # Best for exact matches (minimum difference)
            cv2.TM_CCOEFF_NORMED,      # Good for most cases
            cv2.TM_CCORR_NORMED        # Good for similar lighting
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
        
        # Special case: If images are identical (same dimensions and very high confidence)
        if (h == search_h and w == search_w and best_confidence > 0.95):
            # This is likely an identical image - boost confidence to 100%
            confidence_score = 1.0
            logger.info(f"Identical image detected: dimensions {w}x{h}, confidence boosted to 100%")
        elif h == search_h and w == search_w and best_confidence > 0.8:
            # Same dimensions with high confidence - likely very similar images
            # Boost confidence but don't make it 100% since there might be slight differences
            confidence_score = min(0.98, best_confidence * 1.1)
            logger.info(f"Similar sized image detected: dimensions {w}x{h}, confidence boosted from {best_confidence:.3f} to {confidence_score:.3f}")
        else:
            # Apply size ratio adjustments only for non-identical images
            if size_ratio > 0.8:
                # Only penalize if template is significantly larger than search image
                # But allow for cases where they're the same size
                if size_ratio > 1.0:  # Template is larger than search image
                    confidence_score *= 0.5
                    logger.info(f"Template larger than search image (ratio: {size_ratio:.3f}), confidence penalized to {confidence_score:.3f}")
            elif size_ratio < 0.01:
                confidence_score *= 0.8  # Slight penalty for very small templates
                logger.info(f"Very small template (ratio: {size_ratio:.3f}), confidence penalized to {confidence_score:.3f}")
        
        logger.info(f"Final confidence calculation: raw={best_confidence:.3f}, adjusted={confidence_score:.3f}, method={best_method}")
        
        # Get match region for visualization
        top_left = best_location
        bottom_right = (top_left[0] + w, top_left[1] + h)
        
        # Create annotated image showing the match
        annotated_image = search_image.copy()
        cv2.rectangle(annotated_image, top_left, bottom_right, (0, 255, 0), 2)
        
        # Add confidence text
        cv2.putText(annotated_image, f"Confidence: {confidence_score:.3f}", 
                    (top_left[0], top_left[1] - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        # Save annotated image
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        annotated_filename = f"comparison_result_{timestamp}.jpg"
        annotated_path = os.path.join(UPLOAD_FOLDER, annotated_filename)
        cv2.imwrite(annotated_path, annotated_image)
        
        # Determine match quality
        if confidence_score >= 0.99:
            match_quality = "Perfect Match"
        elif confidence_score >= 0.8:
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
            'annotated_image': annotated_filename,
            'method_used': str(best_method),
            'size_ratio': size_ratio
        }
        
    except Exception as e:
        logger.error(f"Error in image comparison: {e}")
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/')
def index():
    """Main page with upload form"""
    return render_template('index.html')

@app.route('/compare', methods=['POST'])
def compare():
    """Handle image comparison request"""
    try:
        # Check if files were uploaded
        if 'template_image' not in request.files or 'search_image' not in request.files:
            return jsonify({'success': False, 'error': 'Both images are required'})
        
        template_file = request.files['template_image']
        search_file = request.files['search_image']
        
        # Check if files were selected
        if template_file.filename == '' or search_file.filename == '':
            return jsonify({'success': False, 'error': 'Please select both images'})
        
        # Check file sizes
        if template_file.content_length and template_file.content_length > MAX_FILE_SIZE:
            return jsonify({'success': False, 'error': 'Template image is too large (max 16MB)'})
        if search_file.content_length and search_file.content_length > MAX_FILE_SIZE:
            return jsonify({'success': False, 'error': 'Search image is too large (max 16MB)'})
        
        # Save uploaded files
        template_path = save_uploaded_file(template_file)
        search_path = save_uploaded_file(search_file)
        
        if not template_path or not search_path:
            return jsonify({'success': False, 'error': 'Failed to save uploaded files'})
        
        # Perform image comparison
        result = compare_images(template_path, search_path)
        
        if result['success']:
            logger.info(f"Image comparison completed with confidence: {result['confidence']:.3f}")
        else:
            logger.error(f"Image comparison failed: {result['error']}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in comparison endpoint: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 