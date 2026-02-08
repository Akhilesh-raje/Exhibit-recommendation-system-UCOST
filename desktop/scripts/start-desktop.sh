#!/bin/bash
# UCOST Discovery Hub - Desktop App Launcher (Linux/Mac)
# This script launches the desktop app in development mode

cd "$(dirname "$0")/.."
echo "Starting UCOST Discovery Hub Desktop App..."
echo

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo
fi

# Run in development mode
echo "Launching desktop app..."
npm run dev

