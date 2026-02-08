# UCOST Discovery Hub - Portable Runtime Setup
# This script downloads and sets up portable Python and Node.js for bundling

param(
    [string]$OutputDir = ".\portable-runtimes",
    [switch]$PythonOnly,
    [switch]$NodeOnly
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Portable Runtime Setup for UCOST Hub  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# Node.js Portable Setup
if (-not $PythonOnly) {
    Write-Host "[1/2] Setting up Portable Node.js..." -ForegroundColor Yellow
    
    $nodeVersion = "20.11.0"
    $nodeUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
    $nodeZip = Join-Path $OutputDir "node-portable.zip"
    $nodeDir = Join-Path $OutputDir "node-portable"
    
    if (-not (Test-Path $nodeDir)) {
        Write-Host "  Downloading Node.js v$nodeVersion..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
        
        Write-Host "  Extracting..." -ForegroundColor Cyan
        Expand-Archive -Path $nodeZip -DestinationPath $nodeDir -Force
        
        # Move contents up one level
        $extractedFolder = Get-ChildItem -Path $nodeDir -Directory | Select-Object -First 1
        if ($extractedFolder) {
            Get-ChildItem -Path $extractedFolder.FullName | Move-Item -Destination $nodeDir -Force
            Remove-Item -Path $extractedFolder.FullName -Force
        }
        
        Remove-Item -Path $nodeZip -Force
        Write-Host "  ✅ Node.js portable ready at: $nodeDir" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Node.js portable already exists" -ForegroundColor Green
    }
}

# Python Portable Setup
if (-not $NodeOnly) {
    Write-Host "[2/2] Setting up Portable Python..." -ForegroundColor Yellow
    
    $pythonVersion = "3.11.7"
    $pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"
    $pythonZip = Join-Path $OutputDir "python-portable.zip"
    $pythonDir = Join-Path $OutputDir "python-portable"
    
    if (-not (Test-Path $pythonDir)) {
        Write-Host "  Downloading Python v$pythonVersion (embedded)..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonZip -UseBasicParsing
        
        Write-Host "  Extracting..." -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $pythonDir -Force | Out-Null
        Expand-Archive -Path $pythonZip -DestinationPath $pythonDir -Force
        
        # Download get-pip.py
        Write-Host "  Downloading pip installer..." -ForegroundColor Cyan
        $getPipUrl = "https://bootstrap.pypa.io/get-pip.py"
        $getPipPath = Join-Path $pythonDir "get-pip.py"
        Invoke-WebRequest -Uri $getPipUrl -OutFile $getPipPath -UseBasicParsing
        
        # Uncomment python311._pth to allow pip installation
        $pthFile = Get-ChildItem -Path $pythonDir -Filter "python*._pth" | Select-Object -First 1
        if ($pthFile) {
            $content = Get-Content $pthFile.FullName
            $content = $content -replace '^#import site', 'import site'
            Set-Content -Path $pthFile.FullName -Value $content
        }
        
        Write-Host "  Installing pip..." -ForegroundColor Cyan
        & "$pythonDir\python.exe" "$getPipPath" --no-warn-script-location
        
        # Install common packages
        Write-Host "  Installing AI/ML packages..." -ForegroundColor Cyan
        & "$pythonDir\python.exe" -m pip install --no-warn-script-location `
            torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
        & "$pythonDir\python.exe" -m pip install --no-warn-script-location `
            transformers sentence-transformers flask flask-cors numpy pillow pytesseract
        
        Remove-Item -Path $pythonZip -Force
        Remove-Item -Path $getPipPath -Force
        
        Write-Host "  ✅ Python portable ready at: $pythonDir" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Python portable already exists" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Portable Runtimes Setup Complete!  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output directory: $OutputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "To bundle these into your app:" -ForegroundColor Yellow
Write-Host "1. Copy $OutputDir to desktop/resources/" -ForegroundColor White
Write-Host "2. Update packaging-config.json extraResources" -ForegroundColor White
Write-Host "3. Update auto-installer.js to use portable runtimes" -ForegroundColor White
