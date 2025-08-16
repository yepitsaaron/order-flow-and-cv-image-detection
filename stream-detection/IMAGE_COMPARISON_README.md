# Image Comparison Tool

A web-based tool that allows users to upload two images and check if the first image can be extracted from the second using OpenCV template matching with confidence scoring.

## Features

- **Web Interface**: Clean, responsive HTML interface for easy image upload
- **OpenCV Integration**: Uses multiple template matching methods for accurate results
- **Confidence Scoring**: Provides detailed confidence scores and match quality assessment
- **Visual Results**: Shows annotated images with match locations highlighted
- **Multiple File Formats**: Supports PNG, JPG, JPEG, GIF, BMP, and TIFF formats
- **File Size Limits**: Maximum 16MB per image for optimal performance

## How It Works

The tool uses OpenCV's template matching algorithms to find the first image (template) within the second image (search image). It employs multiple matching methods:

1. **TM_CCOEFF_NORMED**: Best for most cases, provides normalized correlation coefficient
2. **TM_CCORR_NORMED**: Good for similar lighting conditions
3. **TM_SQDIFF_NORMED**: Good for exact matches

The system automatically selects the best method and provides a confidence score between 0 and 1.

## Installation

1. **Prerequisites**: Python 3.7+ with pip
2. **Dependencies**: All required packages are listed in `requirements.txt`
3. **Setup**: Run the startup script to automatically set up the environment

## Usage

### Quick Start

1. **Start the application**:
   ```bash
   ./start-image-comparison.sh
   ```

2. **Open your browser** and navigate to: `http://localhost:5001`

3. **Upload images**:
   - **Template Image**: The image you want to search for
   - **Search Image**: The larger image to search within

4. **Click "Compare Images"** to analyze the images

5. **View results** including:
   - Confidence score (0.000 to 1.000)
   - Match quality assessment
   - Image dimensions and match location
   - Annotated result image

### Manual Setup

If you prefer to set up manually:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads

# Run the application
python image_comparison_app.py
```

## Understanding Results

### Confidence Scores

- **0.99 - 1.0**: Perfect Match - Identical or nearly identical images
- **0.8 - 0.98**: Excellent Match - Very high confidence
- **0.6 - 0.79**: Good Match - High confidence
- **0.4 - 0.59**: Moderate Match - Medium confidence
- **0.2 - 0.39**: Weak Match - Low confidence
- **0.0 - 0.19**: No Significant Match - Very low confidence

### Match Quality Factors

The confidence score is influenced by:
- **Template matching accuracy**: How well the template fits in the search image
- **Size ratio**: Template size relative to search image size
- **Image quality**: Resolution and clarity of both images
- **Lighting conditions**: Similarity in brightness and contrast

## Technical Details

### Template Matching Methods

The tool automatically tests multiple OpenCV template matching methods and selects the one with the highest confidence score:

- **cv2.TM_SQDIFF_NORMED**: Normalized square difference (best for exact matches)
- **cv2.TM_CCOEFF_NORMED**: Normalized correlation coefficient (good for most cases)
- **cv2.TM_CCORR_NORMED**: Normalized cross-correlation (good for similar lighting)

**Special Handling for Identical Images**: When images have identical dimensions, the tool performs a direct pixel-by-pixel comparison for perfect accuracy.

### Image Processing

1. Images are converted to grayscale for better matching accuracy
2. Multiple matching methods are applied
3. Best results are selected based on confidence scores
4. An annotated image is generated showing the match location
5. Results are saved to the uploads directory

### File Management

- Uploaded images are saved with unique timestamps
- Annotated result images are automatically generated
- All files are stored in the `uploads/` directory
- File cleanup should be implemented for production use

## API Endpoints

- **GET /**: Main page with upload form
- **POST /compare**: Image comparison endpoint
- **GET /uploads/<filename>**: Serve uploaded and result files

## Configuration

Key configuration options in `image_comparison_app.py`:

- **UPLOAD_FOLDER**: Directory for storing uploaded files
- **MAX_FILE_SIZE**: Maximum file size limit (16MB)
- **ALLOWED_EXTENSIONS**: Supported image file formats
- **Port**: Default Flask port (5001)

## Troubleshooting

### Common Issues

1. **"Failed to read images"**: Check file format and corruption
2. **Low confidence scores**: Try images with better contrast and clarity
3. **Port already in use**: Change port in the application or stop conflicting services

### Performance Tips

- Use images with good contrast and lighting
- Ensure template image is smaller than search image
- Avoid extremely large images (>10MB) for faster processing
- Use PNG or JPG formats for optimal compatibility

## Security Considerations

- **File Upload Validation**: Only image files are accepted
- **File Size Limits**: Prevents large file uploads
- **Unique Filenames**: Prevents filename conflicts
- **Production Ready**: Change secret key and implement proper security measures

## Future Enhancements

Potential improvements for future versions:
- Batch processing of multiple images
- Advanced image preprocessing options
- Machine learning-based matching
- API rate limiting and authentication
- Database storage for comparison history
- Export results in various formats

## Support

For issues or questions:
1. Check the console output for error messages
2. Verify image file formats and sizes
3. Ensure all dependencies are properly installed
4. Check file permissions for uploads directory 