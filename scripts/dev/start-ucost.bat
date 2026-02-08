@echo off
setlocal

REM UCOST Discovery Hub - One Click Launcher (Windows BAT)
cd /d "%~dp0"
cd ..\..

if "%1"=="--install" (
  echo Installing dependencies (this can take a few minutes)...
  npm run install:all
)

echo Starting services (backend, frontend, AI, mobile-backend, OCR, Gemma AI)...
npm run dev:all

endlocal
