#!/bin/bash
# Chatbot Service Startup Script for Git Bash

cd "$(dirname "$0")"

echo "🤖 Starting Chatbot Service..."
echo "📁 Working directory: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if CSV file exists
if [ -f "../../docs/exhibits.csv" ]; then
    echo "✅ CSV file found"
elif [ -f "../docs/exhibits.csv" ]; then
    echo "✅ CSV file found (alternative path)"
else
    echo "⚠️  CSV file not found - will use API fallback"
fi

echo ""
echo "🚀 Starting chatbot service on port 4321..."
echo ""

npm run dev

