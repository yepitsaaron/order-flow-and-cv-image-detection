#!/bin/bash

# T-shirt Detection System Startup Script
# This script starts the real-time video streaming computer vision application

echo "Starting T-shirt Detection System..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if facility ID is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <facility_id> [api_url] [camera_index]"
    echo "Example: $0 f88508c5-1c6d-4fef-b2bc-1a1764a6779e"
    echo "Example: $0 f88508c5-1c6d-4fef-b2bc-1a1764a6779e http://localhost:3001 0"
    exit 1
fi

FACILITY_ID=$1
API_URL=${2:-"http://localhost:3001"}
CAMERA_INDEX=${3:-0}

echo "Starting detection for facility: $FACILITY_ID"
echo "API URL: $API_URL"
echo "Camera index: $CAMERA_INDEX"

# Start the video detector
python3 video_streaming_app.py --facility-id "$FACILITY_ID" --api-url "$API_URL" --camera "$CAMERA_INDEX" 