"""
Python Tests for Video Detection System
Tests OpenCV functionality, image processing, and API integration
"""

import pytest
import cv2
import numpy as np
import os
import tempfile
from unittest.mock import Mock, patch, MagicMock
import sys

# Add the stream-detection directory to the path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the video detection modules
try:
    from video_streaming_app import VideoDetector
    from config import *
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure video_streaming_app.py and config.py exist in the stream-detection directory")
    sys.exit(1)

class TestVideoDetector:
    """Test suite for VideoDetector class"""
    
    @pytest.fixture
    def mock_camera(self):
        """Mock camera for testing"""
        mock_cam = Mock()
        mock_cam.read.return_value = (True, np.zeros((480, 640, 3), dtype=np.uint8))
        mock_cam.isOpened.return_value = True
        return mock_cam
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample test image"""
        # Create a simple test image with a t-shirt-like shape
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Draw a simple rectangle (t-shirt shape)
        cv2.rectangle(img, (200, 150), (440, 350), (255, 255, 255), -1)
        # Add some color variation
        img[150:350, 200:440] = [100, 150, 200]  # Blue-ish color
        return img
    
    @pytest.fixture
    def detector(self):
        """Create a VideoDetector instance for testing"""
        return VideoDetector(facility_id=1)
    
    def test_detector_initialization(self, detector):
        """Test VideoDetector initialization"""
        assert detector.facility_id == 1
        assert detector.is_running == False
        assert detector.capture is None
    
    def test_camera_opening(self, detector, mock_camera):
        """Test camera opening functionality"""
        with patch('cv2.VideoCapture', return_value=mock_camera):
            success = detector.open_camera()
            assert success == True
            assert detector.capture is not None
    
    def test_camera_opening_failure(self, detector):
        """Test camera opening failure handling"""
        with patch('cv2.VideoCapture', return_value=Mock(isOpened=lambda: False)):
            success = detector.open_camera()
            assert success == False
            assert detector.capture is None
    
    def test_t_shirt_detection(self, detector, sample_image):
        """Test t-shirt detection in images"""
        # Test with sample image
        result = detector.detect_t_shirt(sample_image)
        assert isinstance(result, bool)
    
    def test_color_detection(self, detector, sample_image):
        """Test color detection functionality"""
        # Test color detection
        colors = detector.detect_colors(sample_image)
        assert isinstance(colors, list)
        assert len(colors) > 0
    
    def test_feature_extraction(self, detector, sample_image):
        """Test feature extraction from images"""
        # Test feature extraction
        features = detector.extract_features(sample_image)
        assert isinstance(features, np.ndarray)
        assert features.size > 0
    
    def test_order_matching(self, detector):
        """Test order matching functionality"""
        # Mock order data
        mock_orders = [
            {'id': 1, 'color': 'blue', 'design': 'logo1'},
            {'id': 2, 'color': 'red', 'design': 'logo2'}
        ]
        
        # Test matching
        match = detector.find_matching_order('blue', 'logo1', mock_orders)
        assert match is not None
        assert match['id'] == 1
    
    def test_snapshot_capture(self, detector, sample_image):
        """Test snapshot capture functionality"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Test snapshot saving
            snapshot_path = detector.capture_snapshot(sample_image, temp_dir)
            assert os.path.exists(snapshot_path)
            assert snapshot_path.endswith('.jpg')
    
    def test_api_integration(self, detector):
        """Test API integration for sending snapshots"""
        with patch('requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {'success': True}
            
            # Test API call
            result = detector.send_snapshot_to_api('test_image.jpg', 1)
            assert result == True
            mock_post.assert_called_once()
    
    def test_error_handling(self, detector):
        """Test error handling in various scenarios"""
        # Test with invalid image
        with pytest.raises(Exception):
            detector.detect_t_shirt(None)
        
        # Test with invalid camera
        detector.capture = None
        result = detector.read_frame()
        assert result is None

class TestImageProcessing:
    """Test suite for image processing functions"""
    
    def test_image_resize(self):
        """Test image resizing functionality"""
        # Create test image
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        # Test resizing
        resized = cv2.resize(img, (50, 50))
        assert resized.shape == (50, 50, 3)
    
    def test_color_conversion(self):
        """Test color space conversion"""
        # Create test image
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        assert gray.shape == (100, 100)
        assert len(gray.shape) == 2
    
    def test_blob_detection(self):
        """Test blob detection for t-shirt identification"""
        # Create test image with blobs
        img = np.zeros((100, 100), dtype=np.uint8)
        cv2.circle(img, (50, 50), 20, 255, -1)
        
        # Test blob detection
        params = cv2.SimpleBlobDetector_Params()
        detector = cv2.SimpleBlobDetector_create(params)
        keypoints = detector.detect(img)
        
        assert len(keypoints) > 0

class TestConfiguration:
    """Test suite for configuration settings"""
    
    def test_camera_settings(self):
        """Test camera configuration"""
        assert 'CAMERA_INDEX' in globals()
        assert 'FRAME_WIDTH' in globals()
        assert 'FRAME_HEIGHT' in globals()
    
    def test_detection_settings(self):
        """Test detection configuration"""
        assert 'CONFIDENCE_THRESHOLD' in globals()
        assert 'DETECTION_INTERVAL' in globals()
    
    def test_api_settings(self):
        """Test API configuration"""
        assert 'API_BASE_URL' in globals()
        assert 'API_TIMEOUT' in globals()

class TestIntegration:
    """Integration tests for the complete workflow"""
    
    @pytest.fixture
    def mock_detector(self):
        """Create a mock detector for integration testing"""
        detector = Mock()
        detector.detect_t_shirt.return_value = True
        detector.detect_colors.return_value = ['blue']
        detector.extract_features.return_value = np.array([1, 2, 3])
        return detector
    
    def test_complete_workflow(self, mock_detector):
        """Test the complete detection workflow"""
        # Mock the complete workflow
        mock_detector.open_camera.return_value = True
        mock_detector.read_frame.return_value = np.zeros((480, 640, 3))
        mock_detector.process_frame.return_value = True
        
        # Test workflow execution
        result = mock_detector.process_frame(np.zeros((480, 640, 3)))
        assert result == True
        
        # Verify all methods were called
        mock_detector.detect_t_shirt.assert_called_once()
        mock_detector.detect_colors.assert_called_once()
        mock_detector.extract_features.assert_called_once()

if __name__ == '__main__':
    # Run tests with pytest
    pytest.main([__file__, '-v']) 