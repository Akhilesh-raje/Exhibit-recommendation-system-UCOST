#!/bin/bash
# Embed Service Installation Script for Linux/macOS

echo "Installing Embed Service dependencies..."

# Upgrade pip first
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

# Install core FastAPI dependencies
echo "Installing FastAPI and core dependencies..."
pip install fastapi "uvicorn[standard]" pydantic

# Install PyTorch (CPU version)
echo "Installing PyTorch (CPU version)..."
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install transformers and sentence-transformers
echo "Installing sentence-transformers..."
pip install sentence-transformers transformers

echo ""
echo "✅ Installation complete!"
echo "You can now start the service with: python main.py"
echo "Or: npm run dev:embed (from project root)"

