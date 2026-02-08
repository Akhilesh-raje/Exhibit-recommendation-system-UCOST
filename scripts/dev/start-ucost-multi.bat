@echo off
setlocal

REM UCOST Discovery Hub - Multi-window launcher (Windows)
cd /d "%~dp0"
cd ..\..

echo Launching services in separate windows...
start "UCOST Backend" cmd /k npm run dev:backend
start "UCOST Frontend" cmd /k npm run dev:frontend
start "UCOST AI Core" cmd /k npm run dev:ai:core
start "UCOST Mobile Backend" cmd /k npm run dev:mobile-backend
start "UCOST OCR" cmd /k npm run dev:ocr
start "UCOST Gemma AI" cmd /k npm run dev:gemma
start "UCOST Desktop" cmd /k npm run dev:desktop

endlocal
