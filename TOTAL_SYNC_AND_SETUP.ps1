<#
.SYNOPSIS
    UCOST Discovery Hub - Total Sync, Setup, and Launch Orchestrator.
    This script automates everything from code sync to application launch.
#>

$ErrorActionPreference = "Stop"

# --- Colors & Utilities ---
function Write-Header { param($msg) Write-Host "`n================================================" -ForegroundColor Cyan; Write-Host "  $msg" -ForegroundColor Cyan; Write-Host "================================================" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-Process { param($msg) Write-Host "  [..] $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "  [i] $msg" -ForegroundColor Blue }

$PROJECT_ROOT = $PSScriptRoot
Set-Location $PROJECT_ROOT

Write-Header "UCOST Discovery Hub - MASTER ORCHESTRATOR"

# --- Phase 1: Environment Check ---
Write-Header "PHASE 1: Environment Check"

try {
    $nodeVer = node -v
    Write-Success "Node.js $nodeVer detected"
} catch {
    Write-Fail "Node.js not found. Please install Node.js 18+ from https://nodejs.org"
    exit 1
}

try {
    $pyVer = python --version
    Write-Success "Python $pyVer detected"
} catch {
    Write-Warning "Python not found. AI services (Embed/Gemma) require Python 3.9+."
}

# --- Phase 2: Git Sync ---
Write-Header "PHASE 2: Git Sync (Download Latest)"
if (Test-Path ".git") {
    Write-Process "Pulling latest code from repository..."
    try {
        git pull --rebase
        git submodule update --init --recursive
        Write-Success "Code sync complete"
    } catch {
        Write-Warning "Git pull failed. You might have local changes. Continuing anyway..."
    }
} else {
    Write-Info "Not a Git repository. Skipping code download."
}

# --- Phase 3: Total Dependency Install & Build ---
Write-Header "PHASE 3: Full Project Setup (Node & Prisma)"

$services = @(
    @{ Name = "Root Project"; Path = "." },
    @{ Name = "Backend API"; Path = "project/backend/backend" },
    @{ Name = "Frontend UI"; Path = "project/frontend/ucost-discovery-hub" },
    @{ Name = "Chatbot Service"; Path = "project/chatbot-mini" },
    @{ Name = "Desktop App"; Path = "desktop" }
)

foreach ($svc in $services) {
    Write-Host "`n--- Setting up $($svc.Name) ---" -ForegroundColor Blue
    $targetPath = Join-Path $PROJECT_ROOT $svc.Path
    if (-not (Test-Path $targetPath)) {
        Write-Fail "Path not found: $($svc.Path)"
        continue
    }
    
    Set-Location $targetPath
    
    Write-Process "Installing Node modules..."
    npm install
    
    if ($svc.Name -eq "Backend API") {
        # Ensure .env exists for Prisma
        if (-not (Test-Path ".env")) {
            Write-Process "Creating default .env for Backend..."
            "DATABASE_URL=`"file:./dev.db`"`nPORT=5000`nNODE_ENV=development`nJWT_SECRET=ucost_secret_123" | Out-File -FilePath ".env" -Encoding utf8
        }
        Write-Process "Initializing Database (Prisma)..."
        npx prisma generate
        Write-Process "Syncing Database Schema..."
        npx prisma db push --accept-data-loss
        Write-Success "Prisma initialized"
    }
    
    if ($svc.Name -eq "Desktop App") {
        Write-Process "Building Desktop All-in-One..."
        npm run build
        Write-Success "Desktop build complete"
    } elseif ($svc.Name -ne "Root Project") {
        Write-Process "Building artifacts..."
        npm run build
        Write-Success "$($svc.Name) build complete"
    }
}

Set-Location $PROJECT_ROOT

# --- Phase 4: Asset & Database Synchronization ---
Write-Header "PHASE 4: Data & Asset Synchronization"

# 1. Sync CSV
$csvSrc = "docs/exhibits.csv"
$csvDestPaths = @(
    "desktop/resources/docs/exhibits.csv",
    "project/chatbot-mini/docs/exhibits.csv",
    "project/backend/backend/docs/exhibits.csv"
)

if (Test-Path $csvSrc) {
    foreach ($dest in $csvDestPaths) {
        $fullDest = Join-Path $PROJECT_ROOT $dest
        $destDir = Split-Path $fullDest
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force }
        Copy-Item -Path $csvSrc -Destination $fullDest -Force
        Write-Success "Synced exhibits.csv to $dest"
    }
}

# 2. Rebuild AI Embeddings
Write-Host "`n--- Rebuilding AI Knowledge Base ---" -ForegroundColor Blue
if (Test-Path "gemma/scripts/rebuild_embeddings.py") {
    Write-Process "Updating AI vector search database..."
    try {
        python gemma/scripts/rebuild_embeddings.py
        Write-Success "AI Knowledge Base updated"
    } catch {
        Write-Warning "Failed to update AI embeddings. Ensure Python dependencies are installed."
    }
}

# --- Phase 5: Ready to Launch ---
Write-Header "Project Setup Successfully Optimized!"
Write-Info "The UCOST Discovery Hub is ready to run."
Write-Host "`nSelect Launch Mode:" -ForegroundColor Yellow
Write-Host "  [1] Launch Full Development Stack (Separate windows for all services)"
Write-Host "  [2] Launch Desktop Application (Single Window, Production-Ready Mode)"
Write-Host "  [3] Exit Setup"

$choice = Read-Host "`nChoice [1-3]"

switch ($choice) {
    "1" {
        Write-Header "Launching Dev Stack..."
        & "scripts/dev/start-everything.ps1"
    }
    "2" {
        Write-Header "Launching Desktop App..."
        Set-Location "$PROJECT_ROOT/desktop"
        npm run dev:prod
    }
    "3" {
        Write-Host "Setup complete. Run 'npm run setup' in the desktop folder to return here later!" -ForegroundColor Green
    }
    Default {
        Write-Host "No choice made. Setup finished."
    }
}
