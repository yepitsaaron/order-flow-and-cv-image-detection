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
        
        # Color ranges for t-shirt detection (HSV color space)
        self.color_ranges = {
            'white': ([0, 0, 200], [180, 30, 255]),
            'black': ([0, 0, 0], [180, 255, 30]),
            'red': ([0, 100, 100], [10, 255, 255]),
            'blue': ([100, 100, 100], [130, 255, 255]),
            'yellow': ([20, 100, 100], [30, 255, 255]),
            'green': ([40, 100, 100], [80, 255, 255])
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
        """Detect if the frame contains a t-shirt"""
        try:
            # Convert to HSV color space for better color detection
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            
            # Create a mask for potential t-shirt regions
            # Look for large areas of solid colors (typical of t-shirts)
            t_shirt_mask = np.zeros(frame.shape[:2], dtype=np.uint8)
            
            # Check each color range
            for color_name, (lower, upper) in self.color_ranges.items():
                lower = np.array(lower, dtype=np.uint8)
                upper = np.array(upper, dtype=np.uint8)
                
                # Create mask for this color
                color_mask = cv2.inRange(hsv, lower, upper)
                
                # Find contours of this color
                contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                # Look for large contours (potential t-shirt areas)
                for contour in contours:
                    area = cv2.contourArea(contour)
                    if area > 10000:  # Minimum area threshold
                        # Check if contour has reasonable aspect ratio for t-shirt
                        x, y, w, h = cv2.boundingRect(contour)
                        aspect_ratio = w / h
                        
                        if 0.5 < aspect_ratio < 2.0:  # Reasonable t-shirt proportions
                            t_shirt_mask = cv2.bitwise_or(t_shirt_mask, color_mask)
            
            # If we found significant t-shirt-like regions
            t_shirt_pixels = np.sum(t_shirt_mask > 0)
            total_pixels = frame.shape[0] * frame.shape[1]
            t_shirt_ratio = t_shirt_pixels / total_pixels
            
            return t_shirt_ratio > 0.1, t_shirt_mask  # 10% threshold
            
        except Exception as e:
            logger.error(f"Error in t-shirt detection: {e}")
            return False, None
    
    def detect_shirt_color(self, frame, t_shirt_mask):
        """Detect the primary color of the detected t-shirt"""
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
            
            # Determine color based on HSV values
            if avg_v < 50:  # Very dark
                return 'black'
            elif avg_v > 200 and avg_s < 50:  # Very light, low saturation
                return 'white'
            elif 0 <= avg_h <= 10 or 170 <= avg_h <= 180:  # Red
                return 'red'
            elif 100 <= avg_h <= 130:  # Blue
                return 'blue'
            elif 20 <= avg_h <= 30:  # Yellow
                return 'yellow'
            elif 40 <= avg_h <= 80:  # Green
                return 'green'
            else:
                return 'unknown'
                
        except Exception as e:
            logger.error(f"Error in color detection: {e}")
            return None
    
    def extract_design_features(self, frame, t_shirt_mask):
        """Extract features from the t-shirt design/logo area"""
        try:
            # Apply mask to isolate t-shirt region
            masked_frame = cv2.bitwise_and(frame, frame, mask=t_shirt_mask)
            
            # Convert to grayscale for feature extraction
            gray = cv2.cvtColor(masked_frame, cv2.COLOR_BGR2GRAY)
            
            # Use SIFT (Scale-Invariant Feature Transform) for feature detection
            sift = cv2.SIFT_create()
            keypoints, descriptors = sift.detectAndCompute(gray, None)
            
            if descriptors is not None:
                # Return feature count and average descriptor as a simple signature
                return {
                    'feature_count': len(keypoints),
                    'avg_descriptor': np.mean(descriptors, axis=0).tolist() if len(descriptors) > 0 else None
                }
            else:
                return {'feature_count': 0, 'avg_descriptor': None}
                
        except Exception as e:
            logger.error(f"Error in design feature extraction: {e}")
            return {'feature_count': 0, 'avg_descriptor': None}
    
    def find_matching_order(self, detected_color, design_features):
        """Find matching order based on color and design features"""
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
                
                # Design feature matching (simple heuristic)
                if design_features['feature_count'] > 0:
                    # More features = more complex design = higher score
                    feature_score = min(design_features['feature_count'] / 100, 30)
                    score += feature_score
                
                if score > best_score:
                    best_score = score
                    best_match = order
            
            # Return match if score is above threshold
            return best_match if best_score > 30 else None
            
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
                
                # Draw results on frame
                self.draw_detection_results(frame, t_shirt_mask, detected_color, matching_order)
                
                # If we found a match, log it and potentially capture snapshot
                if matching_order:
                    logger.info(f"Potential match found: Order #{matching_order['orderNumber']} - {matching_order['color']} {matching_order['size']}")
                    
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
    
    def draw_detection_results(self, frame, t_shirt_mask, detected_color, matching_order):
        """Draw detection results on the frame"""
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