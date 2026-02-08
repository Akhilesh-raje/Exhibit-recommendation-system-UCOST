@echo off
REM UCOST Discovery Hub - Desktop App Launcher (Windows)
REM This script launches the desktop app in development mode

cd /d "%~dp0\.."
echo Starting UCOST Discovery Hub Desktop App...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Run in development mode
echo Launching desktop app...
call npm run dev

pause

