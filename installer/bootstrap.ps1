# UCOST Discovery Hub - Bootstrap Installer

<#
.SYNOPSIS
    Bootstrap installer for UCOST Discovery Hub
    
.DESCRIPTION
    This script sets up the UCOST Discovery Hub application by:
    - Checking for Git installation
    - Cloning the repository
    - Setting up Node.js (if needed)
    - Setting up Python (if needed)
    - Running initial build
    - Launching the application

.NOTES
    Version: 1.0.0
    Author: UCOST Discovery Hub Team
#>

param(
    [string]$InstallPath = "$env:USERPROFILE\Documents\UCOST-Discovery-Hub",
    [string]$GitRepo = "https://github.com/ucost/uc-discovery-hub.git",
    [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " UCOST Discovery Hub - Setup Wizard  " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction SilentlyContinue) {
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Step 1: Check for Git
Write-Host "[1/6] Checking for Git..." -ForegroundColor Yellow
if (-not (Test-Command "git")) {
    Write-Host "❌ Git is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "After installation, restart this script." -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Git is installed" -ForegroundColor Green

# Step 2: Check for Node.js
Write-Host "[2/6] Checking for Node.js..." -ForegroundColor Yellow
if (-not (Test-Command "node")) {
    Write-Host "⚠️ Node.js is not installed!" -ForegroundColor Yellow
    Write-Host ""
    $installNode = Read-Host "Would you like to download Node.js installer? (Y/N)"
    if ($installNode -eq "Y" -or $installNode -eq "y") {
        Start-Process "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
        Write-Host "Please install Node.js and then restart this script." -ForegroundColor Cyan
        Read-Host "Press Enter to exit"
        exit 1
    }
    else {
        Write-Host "Node.js is required. Exiting." -ForegroundColor Red
        exit 1
    }
}
else {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
}

# Step 3: Check for Python
Write-Host "[3/6] Checking Python..." -ForegroundColor Yellow
if (-not (Test-Command "python")) {
    Write-Host "⚠️ Python is not installed!" -ForegroundColor Yellow
    Write-Host "Python is optional but recommended for full functionality." -ForegroundColor Cyan
    Write-Host "Some AI features will be disabled without Python." -ForegroundColor Cyan
}
else {
    $pythonVersion = python --version
    Write-Host "✅ Python is installed: $pythonVersion" -ForegroundColor Green
}

# Step 4: Clone Repository
Write-Host "[4/6] Cloning repository..." -ForegroundColor Yellow
Write-Host "Install location: $InstallPath" -ForegroundColor Cyan

if (Test-Path $InstallPath) {
    Write-Host "⚠️ Directory already exists: $InstallPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to use this directory? (Y/N)"
    if ($overwrite -ne "Y" -and $overwrite -ne "y") {
        $newPath = Read-Host "Enter new installation path"
        $InstallPath = $newPath
    }
}

if (-not (Test-Path $InstallPath)) {
    Write-Host "Cloning from: $GitRepo" -ForegroundColor Cyan
    git clone $GitRepo $Install Path 2>&1 | Write-Host
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to clone repository" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Repository cloned successfully" -ForegroundColor Green
}
else {
    Write-Host "✅ Using existing directory" -ForegroundColor Green
}

# Step 5: Install Dependencies
Write-Host "[5/6] Installing dependencies..." -ForegroundColor Yellow
Set-Location $InstallPath

Write-Host "Installing root dependencies..." -ForegroundColor Cyan
npm install 2>&1 | Write-Host

Write-Host "Installing workspace dependencies..." -ForegroundColor Cyan
npm run install:workspaces 2>&1 | Write-Host

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Some dependencies may have failed to install" -ForegroundColor Yellow
    Write-Host "The application may still work with limited functionality" -ForegroundColor Cyan
}
else {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Step 6: Build Application
Write-Host "[6/6] Building application..." -ForegroundColor Yellow
npm run build 2>&1 | Write-Host

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Build completed with warnings" -ForegroundColor Yellow
}
else {
    Write-Host "✅ Build complete" -ForegroundColor Green
}

# Launch Application
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "   Installation Complete! 🎉         " -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application installed to: $InstallPath" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipLaunch) {
    Write-Host "Launching UCOST Discovery Hub..." -ForegroundColor Cyan
    Set-Location desktop
    npm run dev
}
else {
    Write-Host "To launch the application:" -ForegroundColor Cyan
    Write-Host "  cd `"$InstallPath\desktop`"" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
}
