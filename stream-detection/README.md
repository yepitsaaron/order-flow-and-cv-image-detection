# Stream Detection - Real-Time T-Shirt Computer Vision System

A complete computer vision application for real-time video streaming that automatically detects completed t-shirts and matches them to pending orders using OpenCV and advanced image processing algorithms.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Webcam or iPhone camera
- Print facility ID from the main system

### Installation & Setup
```bash
# 1. Navigate to stream-detection folder
cd stream-detection

# 2. Make startup script executable
chmod +x start-video-detector.sh

# 3. Start with your facility ID
./start-video-detector.sh YOUR_FACILITY_ID_HERE
```

### Alternative Manual Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python3 video_streaming_app.py --facility-id YOUR_FACILITY_ID_HERE
```

## 📁 File Structure

```
stream-detection/
├── README.md                    # This file - Quick start guide
├── video_streaming_app.py      # Main application
├── config.py                   # Configuration settings
├── requirements.txt            # Python dependencies
├── start-video-detector.sh    # Automated startup script
├── demo-video-detector.py     # Demo mode (no camera required)
├── test-opencv.py             # OpenCV installation test
├── VIDEO_DETECTION_README.md  # Comprehensive usage documentation
└── VIDEO_STREAMING_SUMMARY.md # Technical implementation details
```

## 🎯 What It Does

- **Real-time Video Processing**: Continuously monitors camera streams
- **T-Shirt Detection**: Automatically identifies t-shirt objects
- **Color Recognition**: Detects 6 colors (white, black, red, blue, yellow, green)
- **Design Analysis**: Extracts features from logos/designs using SIFT
- **Order Matching**: Intelligently matches completed items to pending orders
- **Facility Integration**: Works with existing print facility management system

## 🔧 Configuration

### Camera Settings
```python
# config.py
CAMERA_SETTINGS = {
    'width': 1280,      # Video resolution
    'height': 720,
    'fps': 30,          # Frame rate
    'camera_index': 0   # Camera device
}
```

### Detection Parameters
```python
DETECTION_SETTINGS = {
    'min_t_shirt_area': 10000,    # Minimum pixel area
    't_shirt_threshold': 0.1,     # Detection threshold
    'match_score_threshold': 30    # Matching confidence
}
```

## 📱 iPhone Integration

### Setup Options
1. **Direct Connection**: Connect iPhone via USB
2. **Network Streaming**: Use camera streaming apps
3. **Screen Mirroring**: Mirror iPhone screen to computer

### Camera Configuration
```bash
# Use different camera index for iPhone
python3 video_streaming_app.py --facility-id YOUR_ID --camera 1
```

## 🧪 Testing

### Demo Mode (No Camera Required)
```bash
python3 demo-video-detector.py
```

### OpenCV Installation Test
```bash
python3 test-opencv.py
```

## 📚 Documentation

- **[VIDEO_DETECTION_README.md](VIDEO_DETECTION_README.md)** - Complete usage guide
- **[VIDEO_STREAMING_SUMMARY.md](VIDEO_STREAMING_SUMMARY.md)** - Technical details
- **[OpenCV Documentation](https://docs.opencv.org/4.12.0/)** - Official OpenCV docs

## 🚨 Troubleshooting

### Common Issues
- **Camera Access**: Grant camera permissions in system settings
- **OpenCV Installation**: Use `pip install opencv-python>=4.8.0`
- **Performance**: Reduce resolution in `config.py` for faster processing

### Getting Help
1. Check the troubleshooting section in `VIDEO_DETECTION_README.md`
2. Run `test-opencv.py` to verify installation
3. Check system logs and error messages
4. Verify API server connectivity

## 🔗 Integration

This system integrates with the main AI Image Order Reconciliation application:
- **API Endpoint**: `/api/print-facilities/{facilityId}/completion-photos`
- **Order Management**: Automatic refresh every 30 seconds
- **Real-time Matching**: Instant order identification

## 🎉 Ready to Use!

The video streaming computer vision system is fully implemented and ready for production use. Simply run the startup script with your facility ID and start monitoring your production line!

For detailed information, see the comprehensive documentation files in this folder. 