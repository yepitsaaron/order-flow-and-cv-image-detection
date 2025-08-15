"""
Configuration file for the T-shirt Detection System
"""

# Camera settings
CAMERA_SETTINGS = {
    'width': 1280,
    'height': 720,
    'fps': 30,
    'camera_index': 0
}

# Detection settings
DETECTION_SETTINGS = {
    'min_t_shirt_area': 10000,  # Minimum pixel area for t-shirt detection
    't_shirt_threshold': 0.1,   # Minimum ratio of frame that should be t-shirt
    'aspect_ratio_min': 0.5,    # Minimum aspect ratio for t-shirt proportions
    'aspect_ratio_max': 2.0,    # Maximum aspect ratio for t-shirt proportions
    'order_refresh_interval': 30,  # Seconds between order refreshes
    'match_score_threshold': 30   # Minimum score for order matching
}

# Color detection ranges (HSV)
COLOR_RANGES = {
    'white': ([0, 0, 200], [180, 30, 255]),
    'black': ([0, 0, 0], [180, 255, 30]),
    'red': ([0, 100, 100], [10, 255, 255]),
    'blue': ([100, 100, 100], [130, 255, 255]),
    'yellow': ([20, 100, 100], [30, 255, 255]),
    'green': ([40, 100, 100], [80, 255, 255])
}

# API settings
API_SETTINGS = {
    'base_url': 'http://localhost:3001',
    'timeout': 10,
    'retry_attempts': 3
}

# Logging settings
LOGGING_SETTINGS = {
    'level': 'INFO',
    'format': '%(asctime)s - %(levelname)s - %(message)s',
    'file': 't_shirt_detector.log'
}

# Feature extraction settings
FEATURE_SETTINGS = {
    'sift_features': True,
    'orb_features': False,
    'min_feature_count': 10,
    'max_feature_count': 1000
} 