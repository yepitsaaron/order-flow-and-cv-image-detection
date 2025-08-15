#!/usr/bin/env python3
"""
Real-time T-shirt Detection and Order Matching System
Uses OpenCV for computer vision to stream video and automatically match completed t-shirts to orders
"""

import cv2
import numpy as np
import requests
import json
import time
import argparse
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TShirtDetector:
    def __init__(self, facility_id, api_base_url="http://localhost:3001"):
        self.facility_id = facility_id
        self.api_base_url = api_base_url
        self.cap = None
        self.is_running = False
        
        # Load pre-trained models for object detection
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Color ranges for t-shirt detection (HSV color space) - IMPROVED for real-world
        # This can be augmented with more color ranges that are 1:1 with the t-shirt colors to improve detection accuracy
        self.color_ranges = {
            'white': ([0, 0, 180], [180, 50, 255]),      # More inclusive white range
            'black': ([0, 0, 0], [180, 255, 80]),        # More inclusive black range
            'red': ([0, 80, 80], [15, 255, 255]),        # Red range
            'orange': ([10, 80, 80], [25, 255, 255]),    # NEW: Orange range
            'blue': ([95, 80, 80], [135, 255, 255]),     # Expanded blue range
            'yellow': ([15, 60, 80], [35, 255, 255]),    # Expanded yellow range (more inclusive)
            'green': ([35, 60, 80], [85, 255, 255])      # Expanded green range
        }
        
        # Initialize order cache
        self.pending_orders = []
        self.last_order_refresh = 0
        self.order_refresh_interval = 30  # Refresh orders every 30 seconds
        
        logger.info(f"T-shirt detector initialized for facility: {facility_id}")
    
    def start_camera(self, camera_index=0):
        """Initialize camera capture"""
        try:
            self.cap = cv2.VideoCapture(camera_index)
            if not self.cap.isOpened():
                logger.error(f"Failed to open camera {camera_index}")
                return False
            
            # Set camera properties for better quality
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            self.cap.set(cv2.CAP_PROP_FPS, 30)
            
            logger.info("Camera initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing camera: {e}")
            return False
    
    def refresh_pending_orders(self):
        """Fetch pending orders from the API"""
        try:
            current_time = time.time()
            if current_time - self.last_order_refresh < self.order_refresh_interval:
                return
            
            # Use the new available order items endpoint for better data
            response = requests.get(f"{self.api_base_url}/api/print-facilities/{self.facility_id}/available-order-items")
            if response.status_code == 200:
                # Get order items that don't have completion photos yet
                orders_data = response.json()
                self.pending_orders = orders_data
                self.last_order_refresh = current_time
                logger.info(f"Refreshed {len(self.pending_orders)} pending orders")
                
        except Exception as e:
            logger.error(f"Error refreshing pending orders: {e}")
    
    def detect_t_shirt(self, frame):
        """Enhanced detection of t-shirts with graphics, writing, and multiple objects"""
        try:
            # Convert to multiple color spaces for better detection
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Create comprehensive mask for t-shirt regions
            t_shirt_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            
            # Method 1: Color-based detection (base t-shirt colors)
            color_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            for color_name, (lower, upper) in self.color_ranges.items():
                lower = np.array(lower, dtype=np.uint8)
                upper = np.array(upper, dtype=np.uint8)
                
                # Create mask for this color
                current_color_mask = cv2.inRange(hsv, lower, upper)
                color_mask = cv2.bitwise_or(color_mask, current_color_mask)
            
            # Method 2: Edge-based detection for graphics and text
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Use Canny edge detection to find edges (graphics, text, logos)
            edges = cv2.Canny(blurred, 50, 150)
            
            # Method 3: Contour-based detection for complex shapes
            # Find contours in the color mask
            color_contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Find contours in the edge mask (graphics/text)
            edge_contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Combine and analyze contours
            all_contours = []
            
            # Add color-based contours
            for contour in color_contours:
                area = cv2.contourArea(contour)
                if area > 5000:  # Lower threshold to catch smaller elements
                    all_contours.append(('color', contour, area))
            
            # Add edge-based contours (graphics, text)
            for contour in edge_contours:
                area = cv2.contourArea(contour)
                if 100 < area < 50000:  # Graphics/text are usually smaller than full shirts
                    all_contours.append(('edge', contour, area))
            
            logger.info(f"Found {len(color_contours)} color contours and {len(edge_contours)} edge contours")
            logger.info(f"Total contours to process: {len(all_contours)}")
            
            # Group nearby contours that likely belong to the same t-shirt
            grouped_regions = self._group_contours_by_proximity(all_contours, frame.shape)
            logger.info(f"Grouped {len(all_contours)} contours into {len(grouped_regions)} regions")
            
            # Create final mask from grouped regions
            for i, region in enumerate(grouped_regions):
                region_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
                
                # Draw all contours in this region
                for contour_type, contour, area in region:
                    cv2.fillPoly(region_mask, [contour], 255)
                
                # Check if this region has reasonable t-shirt characteristics
                if self._is_valid_t_shirt_region(region_mask, frame.shape):
                    logger.info(f"Region {i} validated as t-shirt")
                    t_shirt_mask = cv2.bitwise_or(t_shirt_mask, region_mask)
                else:
                    logger.info(f"Region {i} rejected as t-shirt")
            
            # If we found significant t-shirt-like regions
            t_shirt_pixels = np.sum(t_shirt_mask > 0)
            total_pixels = frame.shape[0] * frame.shape[1]
            t_shirt_ratio = t_shirt_pixels / total_pixels
            
            # Add debugging information
            logger.info(f"T-shirt detection: {t_shirt_pixels} pixels, {total_pixels} total, ratio: {t_shirt_ratio:.4f}")
            
            # More lenient threshold for testing
            return t_shirt_ratio > 0.02, t_shirt_mask  # Even lower threshold for better detection
            
        except Exception as e:
            logger.error(f"Error in enhanced t-shirt detection: {e}")
            return False, None
    
    def _group_contours_by_proximity(self, contours, frame_shape):
        """Group nearby contours that likely belong to the same t-shirt"""
        try:
            if not contours:
                return []
            
            # Sort contours by area (largest first)
            sorted_contours = sorted(contours, key=lambda x: x[2], reverse=True)
            
            groups = []
            used = set()
            
            for i, (contour_type, contour, area) in enumerate(sorted_contours):
                if i in used:
                    continue
                
                # Start a new group
                current_group = [(contour_type, contour, area)]
                used.add(i)
                
                # Find nearby contours
                for j, (other_type, other_contour, other_area) in enumerate(sorted_contours):
                    if j in used:
                        continue
                    
                    # Check if contours are close to each other
                    if self._contours_are_nearby(contour, other_contour, frame_shape):
                        current_group.append((other_type, other_contour, other_area))
                        used.add(j)
                
                groups.append(current_group)
            
            return groups
            
        except Exception as e:
            logger.error(f"Error grouping contours: {e}")
            return []
    
    def _contours_are_nearby(self, contour1, contour2, frame_shape):
        """Check if two contours are close enough to be part of the same t-shirt"""
        try:
            # Get bounding rectangles
            x1, y1, w1, h1 = cv2.boundingRect(contour1)
            x2, y2, w2, h2 = cv2.boundingRect(contour2)
            
            # Calculate centers
            center1 = (x1 + w1//2, y1 + h1//2)
            center2 = (x2 + w2//2, y2 + h2//2)
            
            # Calculate distance between centers
            distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
            
            # Calculate frame diagonal for relative distance
            frame_diagonal = np.sqrt(frame_shape[0]**2 + frame_shape[1]**2)
            
            # Contours are nearby if distance is less than 30% of frame diagonal
            return distance < 0.3 * frame_diagonal
            
        except Exception as e:
            logger.error(f"Error checking contour proximity: {e}")
            return False
    
    def _is_valid_t_shirt_region(self, region_mask, frame_shape):
        """Check if a region has reasonable t-shirt characteristics"""
        try:
            # Calculate region properties
            region_pixels = np.sum(region_mask > 0)
            total_pixels = frame_shape[0] * frame_shape[1]
            region_ratio = region_pixels / total_pixels
            
            # Get region contours
            contours, _ = cv2.findContours(region_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                logger.info(f"Region validation: No contours found")
                return False
            
            logger.info(f"Region validation: {region_pixels} pixels, {total_pixels} total, ratio: {region_ratio:.4f}")
            
            # Check if any contour has reasonable t-shirt proportions
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                if area < 1000:  # Too small
                    logger.info(f"Contour {i}: Area {area} too small")
                    continue
                
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                
                logger.info(f"Contour {i}: Area {area}, Size {w}x{h}, Aspect ratio {aspect_ratio:.2f}")
                
                # T-shirts typically have aspect ratios between 0.5 and 2.0
                if 0.3 < aspect_ratio < 2.5:  # Slightly more flexible
                    # Check if region size is reasonable - make more lenient for testing
                    if 0.005 < region_ratio <= 1.0:  # Between 0.5% and 100% of frame (allow full frame for testing)
                        logger.info(f"Contour {i} validated as t-shirt")
                        return True
                    else:
                        logger.info(f"Contour {i}: Region ratio {region_ratio:.4f} outside valid range")
                else:
                    logger.info(f"Contour {i}: Aspect ratio {aspect_ratio:.2f} outside valid range")
            
            logger.info("No valid t-shirt contours found")
            return False
            
        except Exception as e:
            logger.error(f"Error validating t-shirt region: {e}")
            return False
    
    def detect_shirt_color(self, frame, t_shirt_mask):
        """Enhanced color detection with improved HSV ranges and mixed color handling"""
        try:
            # Apply mask to isolate t-shirt region
            masked_frame = cv2.bitwise_and(frame, frame, mask=t_shirt_mask)
            
            # Convert to HSV
            hsv = cv2.cvtColor(masked_frame, cv2.COLOR_BGR2HSV)
            
            # Calculate average HSV values in the masked region
            valid_pixels = hsv[t_shirt_mask > 0]
            if len(valid_pixels) == 0:
                return None
            
            avg_h, avg_s, avg_v = np.mean(valid_pixels, axis=0)
            
            # Enhanced color detection with improved thresholds
            if avg_v < 80:  # More inclusive dark threshold
                return 'black'
            elif avg_v > 180 and avg_s < 80:  # More inclusive light threshold
                return 'white'
            elif (0 <= avg_h <= 15) or (165 <= avg_h <= 180):  # Red range
                return 'red'
            elif 10 <= avg_h <= 25:  # NEW: Orange range
                return 'orange'
            elif 95 <= avg_h <= 135:  # Expanded blue range
                return 'blue'
            elif 15 <= avg_h <= 35:  # Expanded yellow range
                return 'yellow'
            elif 35 <= avg_h <= 85:  # Expanded green range
                return 'green'
            else:
                # Try to determine dominant color from the mask
                return self._detect_dominant_color_from_mask(hsv, t_shirt_mask)
                
        except Exception as e:
            logger.error(f"Error in enhanced color detection: {e}")
            return None
    
    def _detect_dominant_color_from_mask(self, hsv, t_shirt_mask):
        """Fallback method to detect dominant color using color range matching"""
        try:
            max_pixels = 0
            dominant_color = 'unknown'
            
            for color_name, (lower, upper) in self.color_ranges.items():
                lower = np.array(lower, dtype=np.uint8)
                upper = np.array(upper, dtype=np.uint8)
                
                # Create mask for this color
                color_mask = cv2.inRange(hsv, lower, upper)
                
                # Apply t-shirt mask to get only t-shirt pixels
                t_shirt_color_mask = cv2.bitwise_and(color_mask, t_shirt_mask)
                
                # Count pixels for this color
                pixel_count = np.sum(t_shirt_color_mask > 0)
                
                if pixel_count > max_pixels:
                    max_pixels = pixel_count
                    dominant_color = color_name
            
            # Only return color if it has significant presence (>10% of t-shirt area)
            t_shirt_area = np.sum(t_shirt_mask > 0)
            if max_pixels > 0.1 * t_shirt_area:
                return dominant_color
            else:
                return 'unknown'
                
        except Exception as e:
            logger.error(f"Error in dominant color detection: {e}")
            return 'unknown'
    
    def extract_design_features(self, frame, t_shirt_mask):
        """Enhanced feature extraction for graphics, text, and complex designs"""
        try:
            # Apply mask to isolate t-shirt region
            masked_frame = cv2.bitwise_and(frame, frame, mask=t_shirt_mask)
            
            # Convert to grayscale for feature extraction
            gray = cv2.cvtColor(masked_frame, cv2.COLOR_BGR2GRAY)
            
            # Method 1: SIFT features for general design elements
            sift = cv2.SIFT_create()
            keypoints, descriptors = sift.detectAndCompute(gray, None)
            
            # Method 2: Edge density analysis for graphics and text
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / np.sum(t_shirt_mask > 0) if np.sum(t_shirt_mask > 0) > 0 else 0
            
            # Method 3: Contour analysis for distinct objects
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by size and complexity
            design_contours = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if 100 < area < 10000:  # Reasonable size for design elements
                    # Calculate contour complexity
                    perimeter = cv2.arcLength(contour, True)
                    complexity = area / (perimeter * perimeter) if perimeter > 0 else 0
                    
                    if complexity > 0.01:  # Filter out very simple shapes
                        design_contours.append({
                            'area': area,
                            'complexity': complexity,
                            'contour': contour
                        })
            
            # Method 4: Text detection using morphological operations
            # Create a kernel for morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            
            # Apply morphological operations to find text-like regions
            dilated = cv2.dilate(edges, kernel, iterations=1)
            text_regions = cv2.erode(dilated, kernel, iterations=1)
            
            # Count text-like regions
            text_contours, _ = cv2.findContours(text_regions, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            text_count = len([c for c in text_contours if cv2.contourArea(c) > 50])
            
            # Calculate comprehensive design score
            feature_count = len(keypoints) if keypoints is not None else 0
            design_complexity = len(design_contours)
            text_elements = text_count
            overall_complexity = edge_density * 1000  # Scale edge density
            
            # Determine design type
            design_type = self._classify_design_type(feature_count, design_complexity, text_elements, edge_density)
            
            return {
                'feature_count': feature_count,
                'avg_descriptor': np.mean(descriptors, axis=0).tolist() if descriptors is not None and len(descriptors) > 0 else None,
                'design_contours': design_complexity,
                'text_elements': text_elements,
                'edge_density': edge_density,
                'overall_complexity': overall_complexity,
                'design_type': design_type
            }
                
        except Exception as e:
            logger.error(f"Error in enhanced design feature extraction: {e}")
            return {
                'feature_count': 0,
                'avg_descriptor': None,
                'design_contours': 0,
                'text_elements': 0,
                'edge_density': 0,
                'overall_complexity': 0,
                'design_type': 'unknown'
            }
    
    def _classify_design_type(self, feature_count, design_contours, text_elements, edge_density):
        """Classify the type of design on the t-shirt"""
        try:
            # Calculate overall complexity score
            complexity_score = (feature_count * 0.3 + 
                              design_contours * 0.3 + 
                              text_elements * 0.2 + 
                              edge_density * 1000 * 0.2)
            
            logger.info(f"Design classification: features={feature_count}, contours={design_contours}, text={text_elements}, edge_density={edge_density:.4f}, complexity={complexity_score:.1f}")
            
            # Classify based on complexity and composition - IMPROVED for real-world examples
            # Special case: Very low complexity with minimal features = Plain (based on production blanks)
            if (text_elements <= 3 and design_contours <= 2 and feature_count < 100 and complexity_score < 50):
                return "Plain"
            elif text_elements > 5:  # Increased threshold for text-heavy designs
                if design_contours > 3:  # Increased threshold for better accuracy
                    return "Text with Graphics"
                else:
                    return "Text Only"
            elif design_contours > 8:  # Increased threshold for graphics-only
                if text_elements > 3:  # Moderate text threshold
                    return "Graphics with Text"
                else:
                    return "Graphics Only"
            elif feature_count > 200:  # Increased threshold for complex designs
                return "Complex Design"
            elif complexity_score > 100:  # Increased threshold for moderate designs
                return "Moderate Design"
            elif complexity_score > 50:  # Increased threshold for simple designs
                return "Simple Design"
            else:
                return "Plain"
                
        except Exception as e:
            logger.error(f"Error classifying design type: {e}")
            return "Unknown"
    
    def find_matching_order(self, detected_color, design_features):
        """Enhanced order matching using comprehensive design analysis"""
        try:
            if not self.pending_orders:
                return None
            
            best_match = None
            best_score = 0
            
            for order in self.pending_orders:
                score = 0
                
                # Color matching (exact match gets high score)
                if order['color'].lower() == detected_color.lower():
                    score += 50
                elif detected_color == 'unknown':
                    score += 10  # Partial score for unknown colors
                
                # Enhanced design feature matching
                if design_features['design_type'] != 'Plain':
                    # Base score for having any design
                    score += 20
                    
                    # Bonus for specific design types
                    if design_features['design_type'] == 'Text Only':
                        score += 15
                    elif design_features['design_type'] == 'Graphics Only':
                        score += 20
                    elif design_features['design_type'] == 'Text with Graphics':
                        score += 25
                    elif design_features['design_type'] == 'Graphics with Text':
                        score += 25
                    elif design_features['design_type'] == 'Complex Design':
                        score += 30
                    
                    # Complexity bonus
                    if design_features['overall_complexity'] > 100:
                        score += 15
                    elif design_features['overall_complexity'] > 50:
                        score += 10
                    
                    # Text element bonus
                    if design_features['text_elements'] > 3:
                        score += 10
                    
                    # Design contour bonus
                    if design_features['design_contours'] > 5:
                        score += 10
                
                # Legacy feature count support
                if design_features['feature_count'] > 0:
                    feature_score = min(design_features['feature_count'] / 100, 20)
                    score += feature_score
                
                if score > best_score:
                    best_score = score
                    best_match = order
            
            # Return match if score is above threshold
            return best_match if best_score > 25 else None
            
        except Exception as e:
            logger.error(f"Error in order matching: {e}")
            return None
    
    def process_frame(self, frame):
        """Process a single frame for t-shirt detection and matching"""
        try:
            # Detect t-shirt
            is_t_shirt, t_shirt_mask = self.detect_t_shirt(frame)
            
            if is_t_shirt:
                # Detect color
                detected_color = self.detect_shirt_color(frame, t_shirt_mask)
                
                # Extract design features
                design_features = self.extract_design_features(frame, t_shirt_mask)
                
                # Find matching order
                matching_order = self.find_matching_order(detected_color, design_features)
                
                # Draw results on frame with enhanced design information
                self.draw_detection_results(frame, t_shirt_mask, detected_color, matching_order, design_features)
                
                # If we found a match, log it and potentially capture snapshot
                if matching_order:
                    design_info = f"({design_features['design_type']}, {design_features['design_contours']} objects, {design_features['text_elements']} text)"
                    logger.info(f"Potential match found: Order #{matching_order['orderNumber']} - {matching_order['color']} {matching_order['size']} - Design: {design_info}")
                    
                    # Add visual indicator for match
                    cv2.putText(frame, f"MATCH: Order #{matching_order['orderNumber']}", 
                              (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
                    # Check if we should capture a snapshot (avoid capturing every frame)
                    current_time = time.time()
                    if not hasattr(self, 'last_snapshot_time'):
                        self.last_snapshot_time = {}
                    
                    order_key = matching_order['orderItemId']
                    if order_key not in self.last_snapshot_time or current_time - self.last_snapshot_time[order_key] > 5:  # 5 second cooldown
                        self.capture_and_process_snapshot(frame, matching_order, detected_color, design_features)
                        self.last_snapshot_time[order_key] = current_time
                else:
                    # No match found - capture snapshot for later manual assignment
                    current_time = time.time()
                    if not hasattr(self, 'last_unmatched_snapshot_time'):
                        self.last_unmatched_snapshot_time = 0
                    
                    if current_time - self.last_unmatched_snapshot_time > 10:  # 10 second cooldown for unmatched
                        design_info = f"({design_features['design_type']}, {design_features['design_contours']} objects, {design_features['text_elements']} text)"
                        logger.info(f"No match found for {detected_color} t-shirt - Design: {design_info}")
                        self.capture_unmatched_snapshot(frame, detected_color, design_features)
                        self.last_unmatched_snapshot_time = current_time
                
                return True, detected_color, matching_order
            else:
                # Draw "No T-shirt detected" message
                cv2.putText(frame, "No T-shirt detected", (10, 30), 
                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                return False, None, None
                
        except Exception as e:
            logger.error(f"Error processing frame: {e}")
            return False, None, None
    
    def draw_detection_results(self, frame, t_shirt_mask, detected_color, matching_order, design_features=None):
        """Enhanced display of detection results with design information"""
        try:
            # Draw t-shirt mask outline
            contours, _ = cv2.findContours(t_shirt_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(frame, contours, -1, (0, 255, 0), 2)
            
            # Draw detection info
            cv2.putText(frame, f"T-shirt detected", (10, 30), 
                      cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            if detected_color:
                cv2.putText(frame, f"Color: {detected_color}", (10, 90), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            
            # Draw enhanced design information
            if design_features:
                y_offset = 120
                
                # Design type
                cv2.putText(frame, f"Design: {design_features.get('design_type', 'Unknown')}", 
                          (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                y_offset += 25
                
                # Complexity info
                if design_features.get('design_contours', 0) > 0:
                    cv2.putText(frame, f"Objects: {design_features['design_contours']}", 
                              (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                    y_offset += 20
                
                if design_features.get('text_elements', 0) > 0:
                    cv2.putText(frame, f"Text elements: {design_features['text_elements']}", 
                              (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                    y_offset += 20
                
                # Overall complexity
                complexity = design_features.get('overall_complexity', 0)
                if complexity > 0:
                    cv2.putText(frame, f"Complexity: {complexity:.1f}", 
                              (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
            
            # Draw facility info
            cv2.putText(frame, f"Facility: {self.facility_id}", (10, frame.shape[0] - 20), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            
            # Add instruction for unmatched photos
            cv2.putText(frame, "Press 'r' to refresh orders, 'q' to quit", (10, frame.shape[0] - 40), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
            
        except Exception as e:
            logger.error(f"Error drawing results: {e}")
    
    def capture_and_process_snapshot(self, frame, matching_order, detected_color, design_features):
        """Capture a snapshot and automatically update order status"""
        try:
            # Create snapshots directory if it doesn't exist
            snapshots_dir = 'snapshots'
            if not os.path.exists(snapshots_dir):
                os.makedirs(snapshots_dir)
            
            # Generate snapshot filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            snapshot_filename = f"snapshot_{matching_order['orderNumber']}_{detected_color}_{timestamp}.jpg"
            snapshot_path = os.path.join(snapshots_dir, snapshot_filename)
            
            # Save the snapshot
            cv2.imwrite(snapshot_path, frame)
            logger.info(f"Snapshot saved: {snapshot_path}")
            
            # Calculate confidence score based on detection quality
            confidence = min(0.8 + (design_features['feature_count'] / 200), 1.0)  # Base 0.8 + feature bonus
            
            # Prepare data for API call
            snapshot_data = {
                'printFacilityId': self.facility_id,
                'detectedColor': detected_color,
                'confidence': confidence,
                'orderItemId': matching_order['orderItemId']
            }
            
            # Create form data for file upload
            with open(snapshot_path, 'rb') as snapshot_file:
                files = {'snapshot': (snapshot_filename, snapshot_file, 'image/jpeg')}
                
                # Send snapshot to API
                response = requests.post(
                    f"{self.api_base_url}/api/video-detection/snapshot",
                    data=snapshot_data,
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Snapshot processed successfully: {result['message']}")
                    
                    # Add success indicator to frame
                    cv2.putText(frame, f"SNAPSHOT SAVED - {result['orderStatus']}", 
                              (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    
                    # Refresh pending orders to reflect the update
                    self.last_order_refresh = 0
                    self.refresh_pending_orders()
                    
                else:
                    logger.error(f"Failed to process snapshot: {response.status_code} - {response.text}")
                    cv2.putText(frame, "SNAPSHOT FAILED", 
                              (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    
        except Exception as e:
            logger.error(f"Error capturing and processing snapshot: {e}")
            cv2.putText(frame, "SNAPSHOT ERROR", 
                      (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    
    def capture_unmatched_snapshot(self, frame, detected_color, design_features):
        """Capture a snapshot when no matching order is found for later manual assignment"""
        try:
            # Create snapshots directory if it doesn't exist
            snapshots_dir = 'snapshots'
            if not os.path.exists(snapshots_dir):
                os.makedirs(snapshots_dir)
            
            # Generate snapshot filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            snapshot_filename = f"unmatched_{detected_color}_{timestamp}.jpg"
            snapshot_path = os.path.join(snapshots_dir, snapshot_filename)
            
            # Save the snapshot
            cv2.imwrite(snapshot_path, frame)
            logger.info(f"Unmatched snapshot saved: {snapshot_path}")
            
            # Calculate confidence score based on detection quality
            confidence = min(0.6 + (design_features['feature_count'] / 200), 0.8)  # Lower confidence for unmatched
            
            # Prepare data for API call - no orderItemId since it's unmatched
            snapshot_data = {
                'printFacilityId': self.facility_id,
                'detectedColor': detected_color,
                'confidence': confidence
                # Note: No orderItemId - this will be assigned manually later
            }
            
            # Create form data for file upload
            with open(snapshot_path, 'rb') as snapshot_file:
                files = {'completionPhoto': (snapshot_filename, snapshot_file, 'image/jpeg')}
                
                # Send snapshot to completion photos API for manual assignment
                response = requests.post(
                    f"{self.api_base_url}/api/completion-photos",
                    data=snapshot_data,
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Unmatched snapshot uploaded successfully: {result['message']}")
                    
                    # Add success indicator to frame
                    cv2.putText(frame, f"UNMATCHED SNAPSHOT SAVED - Manual Assignment Required", 
                              (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 165, 0), 2)
                    
                else:
                    logger.error(f"Failed to upload unmatched snapshot: {response.status_code} - {response.text}")
                    cv2.putText(frame, "UNMATCHED SNAPSHOT FAILED", 
                              (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                    
        except Exception as e:
            logger.error(f"Error capturing unmatched snapshot: {e}")
            cv2.putText(frame, "UNMATCHED SNAPSHOT ERROR", 
                      (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    
    def run(self):
        """Main loop for video processing"""
        if not self.start_camera():
            return
        
        self.is_running = True
        logger.info("Starting video stream processing...")
        
        try:
            while self.is_running:
                # Refresh pending orders periodically
                self.refresh_pending_orders()
                
                # Capture frame
                ret, frame = self.cap.read()
                if not ret:
                    logger.warning("Failed to capture frame")
                    continue
                
                # Process frame
                is_t_shirt, detected_color, matching_order = self.process_frame(frame)
                
                # Display frame
                cv2.imshow('T-shirt Detection System', frame)
                
                # Handle key presses
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    break
                elif key == ord('r'):
                    # Force refresh of orders
                    self.last_order_refresh = 0
                    self.refresh_pending_orders()
                    logger.info("Forced refresh of pending orders")
                
                # Small delay to prevent excessive CPU usage
                time.sleep(0.01)
                
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up resources"""
        self.is_running = False
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        logger.info("Cleanup completed")

def main():
    parser = argparse.ArgumentParser(description='Real-time T-shirt Detection System')
    parser.add_argument('--facility-id', required=True, help='Print facility ID to monitor')
    parser.add_argument('--api-url', default='http://localhost:3001', help='API base URL')
    parser.add_argument('--camera', type=int, default=0, help='Camera index (default: 0)')
    
    args = parser.parse_args()
    
    # Create and run detector
    detector = TShirtDetector(args.facility_id, args.api_url)
    
    try:
        detector.run()
    except Exception as e:
        logger.error(f"Application error: {e}")
        detector.cleanup()

if __name__ == "__main__":
    main() 