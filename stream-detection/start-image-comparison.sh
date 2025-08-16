#!/bin/bash

# Start the Image Comparison Web Application
echo "Starting Image Comparison Tool..."

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

echo "Starting Flask application on http://localhost:5001"
echo "Open your browser and navigate to: http://localhost:5001"
echo "Press Ctrl+C to stop the application"

# Start the Flask app
python image_comparison_app.py 