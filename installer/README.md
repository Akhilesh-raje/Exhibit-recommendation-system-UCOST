# UCOST Discovery Hub - Bootstrap Installer

## Quick Start

**For first-time installation**, simply run the bootstrap script:

```powershell
# Download and run this script
powershell -ExecutionPolicy Bypass -File bootstrap.ps1
```

This will:
1. ✅ Check for Git, Node.js, and Python
2. ✅ Clone the full repository
3. ✅ Install all dependencies
4. ✅ Build the application
5. ✅ Launch automatically

## What Gets Installed

- **Full Source Code** (~500MB) - Complete project repository
- **Node Dependencies** (~300MB) - All npm packages
- **Python Services** (optional) - AI features require Python 3.10+
- **Database** - SQLite database (auto-created on first run)

##  System Requirements

**Required:**
- Windows 10/11 (64-bit)
- Git
- Node.js 18+ and npm 9+
- 2GB free disk space
- Internet connection (for initial download)

**Optional (for full AI features):**
- Python 3.10+
- 4GB RAM (for AI models)

## Installation Steps

### Option A: Automatic (Recommended)

1. Download `bootstrap.ps1`
2. Right-click → "Run with PowerShell"
3. Follow the prompts
4. Application launches automatically!

### Option B: Manual Clone

If you prefer to clone manually:

```bash
git clone https://github.com/ucost/uc-discovery-hub.git
cd uc-discovery-hub
npm install
npm run install:workspaces
npm run build
cd desktop
npm run dev
```

## First-Run Experience

When you first launch the app:

1. **Setup Wizard** runs automatically  
   - Verifies all bundled resources
   - Creates database directory
   - Sets up upload/cache/log directories
   - Checks for Python (optional)

2. **Services Start** automatically
   - Backend API
   - Frontend UI
   - Chatbot (if dependencies available)
   - Python AI services (if Python installed)

3. **App Launches** in your browser
   - Default admin account created
   - Login with: `admin` / `ucost@2025`

## Troubleshooting

### Bootstrap script fails

**Issue:** "Git is not installed"
- **Solution:** Install Git from https://git-scm.com/download/win
- Restart script after installation

**Issue:** "Node.js is not installed"
- **Solution:** Install Node.js from https://nodejs.org (v20 LTS recommended)
- Restart script after installation

### Services don't start

**Check logs:** `%APPDATA%\UCOST Discovery Hub\logs\app.log`

Common fixes:
- Ensure ports 5000, 4321, 8001, 8011, 8089 are available
- Check firewall isn't blocking Node.js
- Try running as Administrator (one time only)

### Python services disabled

**This is OK!** The app works fine without Python. You'll just have limited AI features.

To enable Python services:
1. Install Python 3.10+ from https://python.org
2. Restart the application
3. Python services will auto-detect and start

## What's Different from Manual Install?

|Feature|Bootstrap Installer|Manual Clone|
|-------|------------------|-----------|
|**Git clone**|Automatic|Manual|
|**Dependency checks**|Yes|No|
|**Progress feedback**|Yes|No|
|**Auto-launch**|Yes|No|
|**First-run setup**|Automatic|Manual|
|**One-command install**|✅|❌|

## Updating the App

To update to the latest version:

```powershell
cd path\to\uc-discovery-hub
git pull origin main
npm install
npm run install:workspaces
npm run build
```

Then restart the app.

## Uninstallation

1. Delete the installation folder
2. Delete app data: `%APPDATA%\UCOST Discovery Hub`

That's it! No registry entries or system-wide changes.

## Support

- **Issues:** https://github.com/ucost/uc-discovery-hub/issues
- **Docs:** See `README.md` in project root
- **Email:** support@ucost.uk.gov.in

---

**Version:** 1.0.0  
**Last Updated:** February 2026
