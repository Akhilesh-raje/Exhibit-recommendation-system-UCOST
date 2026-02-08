# Embed Service Installation Script for Windows
# This script installs dependencies in the correct order to avoid Rust compilation issues

Write-Host "Installing Embed Service dependencies..." -ForegroundColor Cyan

# Upgrade pip first
Write-Host "Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install core FastAPI dependencies (these usually have pre-built wheels)
Write-Host "Installing FastAPI and core dependencies..." -ForegroundColor Yellow
pip install fastapi "uvicorn[standard]" pydantic

# Install PyTorch CPU version (has pre-built wheels, no compilation needed)
Write-Host "Installing PyTorch (CPU version)..." -ForegroundColor Yellow
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install transformers and sentence-transformers
Write-Host "Installing sentence-transformers..." -ForegroundColor Yellow
pip install sentence-transformers transformers

Write-Host "`n✅ Installation complete!" -ForegroundColor Green
Write-Host "You can now start the service with: python main.py" -ForegroundColor Green
Write-Host "Or: npm run dev:embed (from project root)" -ForegroundColor Green

