@echo off
REM ============================================================
REM UCOST Discovery Hub - Master Startup Script
REM Starts ALL services + Desktop App
REM ============================================================
setlocal enabledelayedexpansion

cd /d "%~dp0"
cd ..\..

echo.
echo ============================================================
echo   UCOST Discovery Hub - Starting Everything
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Python is not installed or not in PATH
    echo Python services ^(Embed, Gemma^) may not work
    echo.
)

echo [1/6] Checking dependencies...
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

echo.
echo [2/6] Starting Backend Service (Port 5000)...
start "UCOST Backend" cmd /k "title UCOST Backend && npm run dev:backend"

timeout /t 3 /nobreak >nul

echo.
echo [3/6] Starting Frontend Dev Server (Port 5173)...
start "UCOST Frontend" cmd /k "title UCOST Frontend && npm run dev:frontend"

timeout /t 3 /nobreak >nul

echo.
echo [4/6] Starting Python Services...
echo   - Embed Service (Port 8001)...
start "UCOST Embed" cmd /k "title UCOST Embed Service && npm run dev:embed"

timeout /t 2 /nobreak >nul

echo   - Gemma AI Service (Port 8011)...
start "UCOST Gemma" cmd /k "title UCOST Gemma AI && npm run dev:gemma"

timeout /t 2 /nobreak >nul

echo.
echo [5/6] Starting Node.js Services...
echo   - OCR Engine (Port 8088)...
start "UCOST OCR" cmd /k "title UCOST OCR Engine && npm run dev:ocr"

timeout /t 2 /nobreak >nul

echo   - Chatbot Service (Port 4321)...
start "UCOST Chatbot" cmd /k "title UCOST Chatbot && npm run dev:chatbot"

timeout /t 3 /nobreak >nul

echo.
echo [6/6] Starting Desktop Application...
echo.
echo ============================================================
echo   All services are starting in separate windows
echo   Desktop app will launch in a moment...
echo ============================================================
echo.
echo Services starting:
echo   - Backend:      http://localhost:5000
echo   - Frontend:     http://localhost:5173
echo   - Chatbot:      http://localhost:4321
echo   - Embed:        http://localhost:8001
echo   - Gemma:        http://localhost:8011
echo   - OCR:          http://localhost:8088
echo.
echo Waiting 10 seconds for services to initialize...
timeout /t 10 /nobreak >nul

cd desktop
if not exist "node_modules" (
    echo Installing desktop dependencies...
    call npm install
)

echo.
echo Launching Desktop Application...
call npm run dev

endlocal

