#!/bin/bash

echo "Starting Custom T-Shirt Ordering Application..."
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Install frontend dependencies if client/node_modules doesn't exist
if [ ! -d "client/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd client && npm install && cd ..
fi

# Build the frontend
echo "Building frontend..."
npm run build

# Start the server
echo "Starting server on port 3001..."
echo "Frontend will be available at: http://localhost:3001"
echo "API endpoints available at: http://localhost:3001/api/*"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node server.js 