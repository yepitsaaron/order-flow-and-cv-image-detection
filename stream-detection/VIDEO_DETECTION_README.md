# Real-Time T-Shirt Detection System

A computer vision application that uses OpenCV to continuously monitor video streams and automatically detect completed t-shirts, matching them to pending orders in real-time.

## Features

- **Real-time Video Processing**: Continuous video stream analysis using OpenCV
- **T-Shirt Detection**: Computer vision algorithms to identify t-shirt objects
- **Color Recognition**: Automatic detection of t-shirt colors (white, black, red, blue, yellow, green)
- **Design Feature Extraction**: SIFT-based feature detection for logo/design matching
- **Order Matching**: Automatic matching to pending orders based on color and design features
- **Facility Integration**: Works with the existing print facility management system

## Requirements

- **Python 3.8+**
- **OpenCV 4.12.0+** - Computer vision library
- **NumPy** - Numerical computing
- **Requests** - HTTP API communication
- **Webcam/iPhone Camera** - Video input source

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-image-order-reconciliation
```

### 2. Install Dependencies
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 3. Verify OpenCV Installation
```bash
python3 -c "import cv2; print(f'OpenCV version: {cv2.__version__}')"
```

## Usage

### Quick Start
```bash
# Start with facility ID
./start-video-detector.sh f88508c5-1c6d-4fef-b2bc-1a1764a6779e

# Or run directly with Python
python3 video-streaming-app.py --facility-id f88508c5-1c6d-4fef-b2bc-1a1764a6779e
```

### Command Line Options
```bash
python3 video-streaming-app.py --help

# Required arguments
--facility-id FACILITY_ID    Print facility ID to monitor

# Optional arguments
--api-url API_URL           API base URL (default: http://localhost:3001)
--camera CAMERA             Camera index (default: 0)
```

### Examples
```bash
# Basic usage
python3 video-streaming-app.py --facility-id f88508c5-1c6d-4fef-b2bc-1a1764a6779e

# Custom API URL
python3 video-streaming-app.py --facility-id f88508c5-1c6d-4fef-b2bc-1a1764a6779e --api-url http://192.168.1.100:3001

# Different camera
python3 video-streaming-app.py --facility-id f88508c5-1c6d-4fef-b2bc-1a1764a6779e --camera 1
```

## How It Works

### 1. Video Capture
- Initializes camera/webcam for video input
- Configurable resolution (1280x720) and frame rate (30 FPS)
- Supports multiple camera indices

### 2. T-Shirt Detection
- **Color-based Detection**: Uses HSV color space for robust color recognition
- **Shape Analysis**: Analyzes contours and aspect ratios to identify t-shirt-like objects
- **Area Thresholding**: Filters objects by size to focus on actual t-shirts

### 3. Color Recognition
- **HSV Color Space**: More reliable than RGB for color detection
- **Predefined Color Ranges**: Optimized ranges for common t-shirt colors
- **Adaptive Thresholding**: Handles lighting variations

### 4. Design Feature Extraction
- **SIFT Features**: Scale-Invariant Feature Transform for robust feature detection
- **Feature Counting**: Analyzes complexity of designs/logos
- **Descriptor Analysis**: Creates feature signatures for matching

### 5. Order Matching
- **Color Matching**: Exact color matches get high scores
- **Feature Matching**: Complex designs get higher scores
- **Score Thresholding**: Only returns matches above confidence threshold

### 6. Real-time Display
- **Live Video Feed**: Shows camera input with detection overlays
- **Visual Indicators**: Highlights detected t-shirts and matches
- **Status Information**: Displays detection results and facility info

## Configuration

### Camera Settings
```python
# config.py
CAMERA_SETTINGS = {
    'width': 1280,      # Video width
    'height': 720,      # Video height
    'fps': 30,          # Frame rate
    'camera_index': 0   # Camera device index
}
```

### Detection Parameters
```python
DETECTION_SETTINGS = {
    'min_t_shirt_area': 10000,    # Minimum pixel area
    't_shirt_threshold': 0.1,     # Detection threshold
    'aspect_ratio_min': 0.5,      # Shape constraints
    'aspect_ratio_max': 2.0,
    'match_score_threshold': 30   # Matching confidence
}
```

### Color Detection Ranges
```python
COLOR_RANGES = {
    'white': ([0, 0, 200], [180, 30, 255]),
    'black': ([0, 0, 0], [180, 255, 30]),
    'red': ([0, 100, 100], [10, 255, 255]),
    'blue': ([100, 100, 100], [130, 255, 255]),
    'yellow': ([20, 100, 100], [30, 255, 255]),
    'green': ([40, 100, 100], [80, 255, 255])
}
```

## Controls

### Keyboard Shortcuts
- **Q**: Quit application
- **R**: Force refresh of pending orders
- **ESC**: Exit (alternative to Q)

### Visual Indicators
- **Green Outline**: Detected t-shirt boundaries
- **Green Text**: "T-shirt detected" when object found
- **Yellow Text**: Detected color information
- **Green Text**: Order match information
- **Red Text**: "No T-shirt detected" when no object found

## Integration with Existing System

### API Endpoints Used
- `GET /api/print-facilities/{facilityId}/completion-photos` - Fetch pending orders
- Automatic order refresh every 30 seconds
- Real-time matching against current pending orders

### Data Flow
1. **Video Input** → Camera/webcam stream
2. **Object Detection** → T-shirt identification
3. **Feature Extraction** → Color and design analysis
4. **Order Matching** → API query and matching
5. **Result Display** → Visual feedback and logging

## Performance Considerations

### Optimization Tips
- **Lower Resolution**: Reduce camera resolution for faster processing
- **Frame Skipping**: Process every Nth frame for performance
- **ROI Processing**: Focus on specific regions of interest
- **GPU Acceleration**: Use OpenCV with CUDA support if available

### System Requirements
- **CPU**: Multi-core processor recommended
- **Memory**: 4GB+ RAM for smooth operation
- **Camera**: USB webcam or built-in camera
- **Network**: Stable connection to API server

## Troubleshooting

### Common Issues

#### Camera Not Found
```bash
# Check available cameras
ls /dev/video*

# Try different camera index
python3 video-streaming-app.py --facility-id <id> --camera 1
```

#### OpenCV Installation Issues
```bash
# Reinstall OpenCV
pip uninstall opencv-python
pip install opencv-python==4.12.0.74

# Check installation
python3 -c "import cv2; print(cv2.__version__)"
```

#### API Connection Errors
```bash
# Verify API server is running
curl http://localhost:3001/api/health

# Check facility ID exists
curl http://localhost:3001/api/print-facilities
```

### Debug Mode
```python
# Enable debug logging in config.py
LOGGING_SETTINGS = {
    'level': 'DEBUG',
    # ... other settings
}
```

## Development

### Adding New Features
1. **New Color Detection**: Add HSV ranges to `COLOR_RANGES`
2. **Enhanced Object Detection**: Modify `detect_t_shirt()` method
3. **Better Feature Extraction**: Enhance `extract_design_features()` method
4. **Improved Matching**: Update `find_matching_order()` algorithm

### Testing
```bash
# Test with sample images
python3 -c "
import cv2
import numpy as np
from video_streaming_app import TShirtDetector

detector = TShirtDetector('test-facility')
# Add test code here
"
```

## License

This project is part of the AI Image Order Reconciliation system and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review OpenCV documentation: https://docs.opencv.org/4.12.0/
3. Check system logs and error messages
4. Verify API server connectivity and facility configuration 