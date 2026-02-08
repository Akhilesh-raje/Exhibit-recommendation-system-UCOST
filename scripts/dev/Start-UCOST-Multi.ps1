Param(
  [switch]$Install
)

Write-Host "UCOST Discovery Hub - Multi-window Launcher" -ForegroundColor Cyan

$ErrorActionPreference = 'Stop'

# Move to repo root from scripts/dev
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path (Join-Path $scriptDir "..\..")

if ($Install) {
  Write-Host "Installing dependencies (this can take a few minutes)..." -ForegroundColor Yellow
  npm run install:all
}

Write-Host "Launching services in separate PowerShell windows..." -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:backend'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:frontend'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:ai:core'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:mobile-backend'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:ocr'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:embed'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:gemma'
Start-Process powershell -ArgumentList '-NoExit','-Command','npm run dev:desktop'
