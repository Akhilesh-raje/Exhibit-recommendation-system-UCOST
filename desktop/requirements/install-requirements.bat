@echo off
REM Python Requirements Installer for Windows
REM This script installs all Python dependencies

setlocal enabledelayedexpansion

echo ========================================
echo UCOST Discovery Hub - Python Setup
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found:
python --version
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "REQUIREMENTS_FILE=%SCRIPT_DIR%requirements.txt"

if not exist "%REQUIREMENTS_FILE%" (
    echo ERROR: Requirements file not found: %REQUIREMENTS_FILE%
    pause
    exit /b 1
)

echo Installing Python dependencies...
echo This may take several minutes...
echo.

REM Upgrade pip first
python -m pip install --upgrade pip

REM Install PyTorch separately (CPU version)
echo.
echo Installing PyTorch (this may take a while)...
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

REM Install all other requirements
echo.
echo Installing other dependencies...
python -m pip install -r "%REQUIREMENTS_FILE%"

if errorlevel 1 (
    echo.
    echo WARNING: Some packages failed to install
    echo Trying minimal installation...
    python -m pip install -r "%SCRIPT_DIR%requirements-min.txt"
)

echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
pause

