Param(
  [switch]$Install
)

Write-Host "UCOST Discovery Hub - One Click Launcher" -ForegroundColor Cyan

$ErrorActionPreference = 'Stop'

# Move to repo root from scripts/dev
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path (Join-Path $scriptDir "..\..")

if ($Install) {
  Write-Host "Installing dependencies (this can take a few minutes)..." -ForegroundColor Yellow
  npm run install:all
}

Write-Host "Starting services (backend, frontend, AI, mobile-backend, OCR)..." -ForegroundColor Green
npm run dev:all
