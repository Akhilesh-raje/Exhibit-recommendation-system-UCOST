# =============================================================================
# UCOST Discovery Hub - Complete Rebuild Script (PowerShell)
# =============================================================================
# This script performs a complete rebuild of all services from scratch
# Usage: .\REBUILD_FROM_SCRATCH.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Status { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ $msg" -ForegroundColor Blue }
function Write-Warning { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }

# Project root directory
$PROJECT_ROOT = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Blue
Write-Host "UCOST Discovery Hub - Complete Rebuild" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# =============================================================================
# PHASE 1: CLEAN ALL BUILD DIRECTORIES
# =============================================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "PHASE 1: Cleaning Build Directories" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

$cleanDirs = @(
    "project\frontend\ucost-discovery-hub\dist",
    "project\backend\backend\dist",
    "project\chatbot-mini\dist",
    "desktop\dist"
)

foreach ($dir in $cleanDirs) {
    $fullPath = Join-Path $PROJECT_ROOT $dir
    if (Test-Path $fullPath) {
        Write-Info "Removing: $dir"
        Remove-Item -Path $fullPath -Recurse -Force
        Write-Status "Cleaned: $dir"
    } else {
        Write-Info "Skipping (not found): $dir"
    }
}

# =============================================================================
# PHASE 2: INSTALL DEPENDENCIES
# =============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "PHASE 2: Installing Dependencies" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Frontend
Write-Host "Installing Frontend dependencies..." -ForegroundColor Yellow
$frontendPath = Join-Path $PROJECT_ROOT "project\frontend\ucost-discovery-hub"
Set-Location $frontendPath
try {
    npm install
    Write-Status "Frontend dependencies installed"
} catch {
    Write-Error "Frontend dependencies installation failed"
    exit 1
}

# Backend
Write-Host "Installing Backend dependencies..." -ForegroundColor Yellow
$backendPath = Join-Path $PROJECT_ROOT "project\backend\backend"
Set-Location $backendPath
try {
    npm install
    Write-Status "Backend dependencies installed"
} catch {
    Write-Error "Backend dependencies installation failed"
    exit 1
}

# Chatbot
Write-Host "Installing Chatbot dependencies..." -ForegroundColor Yellow
$chatbotPath = Join-Path $PROJECT_ROOT "project\chatbot-mini"
Set-Location $chatbotPath
try {
    npm install
    Write-Status "Chatbot dependencies installed"
} catch {
    Write-Error "Chatbot dependencies installation failed"
    exit 1
}

# Desktop
Write-Host "Installing Desktop app dependencies..." -ForegroundColor Yellow
$desktopPath = Join-Path $PROJECT_ROOT "desktop"
Set-Location $desktopPath
try {
    npm install
    Write-Status "Desktop app dependencies installed"
} catch {
    Write-Error "Desktop app dependencies installation failed"
    exit 1
}

# =============================================================================
# PHASE 3: BUILD SERVICES
# =============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "PHASE 3: Building Services" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Build Backend
Write-Host "Building Backend..." -ForegroundColor Yellow
Set-Location $backendPath
try {
    npm run build
    Write-Status "Backend built successfully"
    
    # Generate Prisma client
    Write-Host "Generating Prisma client..." -ForegroundColor Yellow
    try {
        npx prisma generate
        Write-Status "Prisma client generated"
    } catch {
        Write-Warning "Prisma client generation failed (may not be critical)"
    }
} catch {
    Write-Error "Backend build failed"
    exit 1
}

# Build Chatbot
Write-Host "Building Chatbot..." -ForegroundColor Yellow
Set-Location $chatbotPath
try {
    npm run build
    Write-Status "Chatbot built successfully"
} catch {
    Write-Error "Chatbot build failed"
    exit 1
}

# Build Frontend
Write-Host "Building Frontend..." -ForegroundColor Yellow
Set-Location $frontendPath
try {
    npm run build
    Write-Status "Frontend built successfully"
    
    # Verify React loading order
    Write-Host "Verifying React loading order..." -ForegroundColor Yellow
    $indexHtml = Join-Path $frontendPath "dist\index.html"
    if (Test-Path $indexHtml) {
        $content = Get-Content $indexHtml -Raw
        if ($content -match "vendor-react" -and $content -match "vendor-misc") {
            $reactLine = ([regex]::Matches($content, "vendor-react") | Select-Object -First 1).Index
            $miscLine = ([regex]::Matches($content, "vendor-misc") | Select-Object -First 1).Index
            if ($reactLine -lt $miscLine) {
                Write-Status "React loads before vendor-misc ✓"
            } else {
                Write-Warning "React may load after vendor-misc (check vite-plugin-react-first)"
            }
        }
    }
} catch {
    Write-Error "Frontend build failed"
    exit 1
}

# =============================================================================
# PHASE 4: VERIFY BUILD OUTPUTS
# =============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "PHASE 4: Verifying Build Outputs" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Verify Frontend
$frontendIndex = Join-Path $PROJECT_ROOT "project\frontend\ucost-discovery-hub\dist\index.html"
if (Test-Path $frontendIndex) {
    Write-Status "Frontend index.html exists"
} else {
    Write-Error "Frontend index.html missing"
    exit 1
}

# Verify Backend
$backendApp = Join-Path $PROJECT_ROOT "project\backend\backend\dist\app.js"
if (Test-Path $backendApp) {
    Write-Status "Backend app.js exists"
} else {
    Write-Error "Backend app.js missing"
    exit 1
}

# Verify Chatbot
$chatbotServer = Join-Path $PROJECT_ROOT "project\chatbot-mini\dist\server.js"
if (Test-Path $chatbotServer) {
    Write-Status "Chatbot server.js exists"
} else {
    Write-Error "Chatbot server.js missing"
    exit 1
}

# =============================================================================
# PHASE 5: DESKTOP APP BUILD
# =============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "PHASE 5: Building Desktop App" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

Set-Location $desktopPath

# Pre-deployment checks
Write-Host "Running pre-deployment checks..." -ForegroundColor Yellow
try {
    npm run pre-deploy
    Write-Status "Pre-deployment checks passed"
} catch {
    Write-Warning "Pre-deployment checks failed (continuing anyway)"
}

# Build all services (runs Phase 3 automatically)
Write-Host "Building all services for desktop..." -ForegroundColor Yellow
try {
    npm run build
    Write-Status "All services built for desktop"
} catch {
    Write-Error "Desktop build failed"
    exit 1
}

# =============================================================================
# PHASE 6: FINAL VERIFICATION
# =============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "PHASE 6: Final Verification" -ForegroundColor Blue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host ""

# Check all critical files
$criticalFiles = @(
    "project\frontend\ucost-discovery-hub\dist\index.html",
    "project\backend\backend\dist\app.js",
    "project\chatbot-mini\dist\server.js",
    "desktop\main.js",
    "desktop\src\config.js",
    "desktop\src\service-manager.js",
    "desktop\src\window-manager.js"
)

$allPresent = $true
foreach ($file in $criticalFiles) {
    $fullPath = Join-Path $PROJECT_ROOT $file
    if (Test-Path $fullPath) {
        Write-Status "Found: $file"
    } else {
        Write-Error "Missing: $file"
        $allPresent = $false
    }
}

if ($allPresent) {
    Write-Status "All critical files present"
} else {
    Write-Error "Some critical files are missing"
    exit 1
}

# =============================================================================
# SUCCESS
# =============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✓ REBUILD COMPLETE" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

Write-Info "Next steps:"
Write-Host "  1. Test development mode: cd desktop && npm run dev" -ForegroundColor Yellow
Write-Host "  2. Test production mode: cd desktop && npm run dev:prod" -ForegroundColor Yellow
Write-Host "  3. Package for distribution: cd desktop && npm run package" -ForegroundColor Yellow
Write-Host ""

