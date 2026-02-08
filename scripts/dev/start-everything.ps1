# ============================================================
# UCOST Discovery Hub - Master Startup Script (PowerShell)
# Starts ALL services + Desktop App
# ============================================================

$ErrorActionPreference = "Continue"

# Get script directory and navigate to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Join-Path $scriptDir "..\.."
Set-Location $projectRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  UCOST Discovery Hub - Starting Everything" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "[OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Python is not installed or not in PATH" -ForegroundColor Yellow
    Write-Host "Python services (Embed, Gemma) may not work" -ForegroundColor Yellow
    Write-Host ""
}

# Check dependencies
Write-Host "[1/6] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "[2/6] Starting Backend Service (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$host.ui.RawUI.WindowTitle = 'UCOST Backend'; npm run dev:backend"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[3/6] Starting Frontend Dev Server (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$host.ui.RawUI.WindowTitle = 'UCOST Frontend'; npm run dev:frontend"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[4/6] Starting Python Services..." -ForegroundColor Yellow
Write-Host "  - Embed Service (Port 8001)..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$host.ui.RawUI.WindowTitle = 'UCOST Embed Service'; npm run dev:embed"

Start-Sleep -Seconds 2

Write-Host "  - Gemma AI Service (Port 8011)..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$host.ui.RawUI.WindowTitle = 'UCOST Gemma AI'; npm run dev:gemma"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "[5/6] Starting Node.js Services..." -ForegroundColor Yellow
Write-Host "  - OCR Engine (Port 8088)..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$host.ui.RawUI.WindowTitle = 'UCOST OCR Engine'; npm run dev:ocr"

Start-Sleep -Seconds 2

Write-Host "  - Chatbot Service (Port 4321)..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; `$host.ui.RawUI.WindowTitle = 'UCOST Chatbot'; npm run dev:chatbot"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[6/6] Starting Desktop Application..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  All services are starting in separate windows" -ForegroundColor Cyan
Write-Host "  Desktop app will launch in a moment..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services starting:" -ForegroundColor White
Write-Host "  - Backend:      http://localhost:5000" -ForegroundColor Gray
Write-Host "  - Frontend:     http://localhost:5173" -ForegroundColor Gray
Write-Host "  - Chatbot:      http://localhost:4321" -ForegroundColor Gray
Write-Host "  - Embed:        http://localhost:8001" -ForegroundColor Gray
Write-Host "  - Gemma:        http://localhost:8011" -ForegroundColor Gray
Write-Host "  - OCR:          http://localhost:8088" -ForegroundColor Gray
Write-Host ""
Write-Host "Waiting 10 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$desktopDir = Join-Path $projectRoot "desktop"
Set-Location $desktopDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing desktop dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Launching Desktop Application..." -ForegroundColor Green
npm run dev

