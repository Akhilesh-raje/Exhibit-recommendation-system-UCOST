# 🚀 HOW TO RUN - UCOST Discovery Hub Desktop App

## ✅ **VERIFICATION COMPLETE**

All files verified:
- ✅ `main.js` - Main Electron process
- ✅ `package.json` - Dependencies and scripts
- ✅ `src/config.js` - Configuration
- ✅ Installer created: `dist/UCOST Discovery Hub Setup 1.0.0.exe`

---

## 🎯 **THREE WAYS TO RUN**

### **Method 1: Run the Installer (Production - Recommended)**

**For End Users:**

1. **Locate the installer:**
   ```
   desktop/dist/UCOST Discovery Hub Setup 1.0.0.exe
   ```

2. **Double-click** the installer

3. **Follow** the installation wizard:
   - Choose installation directory (optional)
   - Click "Install"
   - Wait for installation to complete

4. **Launch** the app:
   - From **Start Menu**: Search "UCOST Discovery Hub"
   - From **Desktop**: Double-click the shortcut
   - From **Installation folder**: Run `UCOST Discovery Hub.exe`

5. **First Launch:**
   - Wait for splash screen (services initializing)
   - App window opens automatically
   - Login with:
     - **Email**: `admin@ucost.com`
     - **Password**: `admin123`
   - ⚠️ **Change password immediately!**

---

### **Method 2: Development Mode (For Developers)**

**Prerequisites:**
- Node.js 18+ installed
- Python 3.10+ installed
- All project dependencies installed

**Steps:**

1. **Open terminal** in the project root:
   ```bash
   cd "C:\Users\rajea\Desktop\Internship 2025\uc work\desktop"
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Install Python dependencies** (if not already done):
   ```bash
   # Embed Service
   cd ../project/embed-service
   pip install -r requirements.txt
   
   # Gemma
   cd ../../gemma
   pip install -r requirements.txt
   
   # OCR Engine
   cd ../project/ocr-engine
   pip install -r requirements.txt
   
   # Return to desktop directory
   cd ../../desktop
   ```

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

   **OR use the startup script:**
   ```bash
   scripts\start-desktop.bat
   ```

5. **What happens:**
   - Electron window opens
   - Splash screen shows progress
   - All services start automatically
   - Frontend opens at `http://localhost:5173`
   - DevTools opens automatically (for debugging)

---

### **Method 3: Run Unpacked App (Testing)**

**For testing without installing:**

1. **Navigate to unpacked app:**
   ```bash
   cd desktop/dist/win-unpacked
   ```

2. **Run the executable:**
   ```bash
   "UCOST Discovery Hub.exe"
   ```

   **OR double-click** `UCOST Discovery Hub.exe` in File Explorer

3. **App launches** with all services bundled

---

## 📋 **AVAILABLE COMMANDS**

### **Development Commands**

```bash
# Run in development mode (uses system services)
npm run dev

# Run in production mode (uses bundled services)
npm run dev:prod

# Start script (Windows)
scripts\start-desktop.bat

# Start script (Linux/Mac)
./scripts/start-desktop.sh
```

### **Build Commands**

```bash
# Build all services (frontend, backend, chatbot)
npm run build

# Build individual services
npm run build:frontend
npm run build:backend
npm run build:chatbot

# Create installer (includes pre-deploy check and build)
npm run package

# Create unpacked app only (no installer)
npm run package:dir

# Pre-deployment validation
npm run pre-deploy
```

---

## 🔍 **WHAT HAPPENS WHEN YOU RUN**

### **Startup Sequence:**

1. **Splash Screen** appears
   - Shows "Setting up environment..."
   - Progress: 0%

2. **Environment Setup**
   - Creates user data directories
   - Progress: 10%

3. **Database Initialization**
   - Creates SQLite database
   - Runs Prisma migrations
   - Progress: 15%

4. **Service Startup** (in order):
   - Backend (port 5000) - Progress: 20-30%
   - Embed Service (port 8001) - Progress: 30-40%
   - Gemma (port 8011) - Progress: 40-50%
   - OCR Engine (port 8088) - Progress: 50-60%
   - Chatbot (port 4321) - Progress: 60-70%

5. **Frontend Server** starts
   - Serves React app
   - Progress: 70-80%

6. **Main Window** opens
   - Frontend loads
   - Progress: 90-100%

7. **Splash Screen** closes
   - App ready!

**Total startup time:** ~10-30 seconds (depending on system)

---

## 🌐 **SERVICE URLS**

Once running, services are available at:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Admin dashboard |
| **Backend API** | http://localhost:5000 | REST API |
| **Chatbot** | http://localhost:4321 | AI Chatbot |
| **Embed Service** | http://localhost:8001 | Text embeddings |
| **Gemma** | http://localhost:8011 | AI recommendations |
| **OCR Engine** | http://localhost:8088 | Text recognition |

**Note:** Ports may vary if conflicts occur (app auto-finds available ports)

---

## 🔐 **DEFAULT CREDENTIALS**

**First Login:**
- **Email**: `admin@ucost.com`
- **Password**: `admin123`

⚠️ **IMPORTANT:** Change password immediately after first login!

---

## 📍 **FILE LOCATIONS**

### **Application Files**
- **Installer**: `desktop/dist/UCOST Discovery Hub Setup 1.0.0.exe`
- **Unpacked App**: `desktop/dist/win-unpacked/`
- **Source Code**: `desktop/`

### **User Data** (Created on first run)
- **Database**: `%APPDATA%\UCOST Discovery Hub\database.db`
- **Uploads**: `%APPDATA%\UCOST Discovery Hub\uploads\`
- **Logs**: `%APPDATA%\UCOST Discovery Hub\logs\`
- **Cache**: `%APPDATA%\UCOST Discovery Hub\cache\`

### **Logs**
- **Application Logs**: `%APPDATA%\UCOST Discovery Hub\logs\app-YYYY-MM-DD.log`

---

## 🐛 **TROUBLESHOOTING**

### **App Won't Start**

1. **Check prerequisites:**
   ```bash
   node --version    # Should be v18+
   python --version # Should be 3.10+
   ```

2. **Check ports:**
   ```bash
   netstat -ano | findstr :5000
   ```

3. **Check logs:**
   ```
   %APPDATA%\UCOST Discovery Hub\logs\app-YYYY-MM-DD.log
   ```

4. **Run as Administrator:**
   - Right-click → Run as Administrator

### **Services Won't Start**

1. **Python services:**
   - Ensure Python 3.10+ is installed
   - Check Python is in PATH: `python --version`
   - Install dependencies: `pip install -r requirements.txt`

2. **Node.js services:**
   - Ensure Node.js 18+ is installed
   - Check dependencies: `npm install`

3. **Port conflicts:**
   - App automatically finds available ports
   - Check logs for actual ports used

### **Database Errors**

1. **Check database file:**
   ```
   %APPDATA%\UCOST Discovery Hub\database.db
   ```

2. **Check permissions:**
   - Ensure write access to user data directory

3. **Reset database** (⚠️ deletes all data):
   - Delete `database.db`
   - App will recreate on next launch

---

## ✅ **QUICK START CHECKLIST**

### **For End Users:**
- [ ] Download installer: `dist/UCOST Discovery Hub Setup 1.0.0.exe`
- [ ] Run installer
- [ ] Launch from Start Menu
- [ ] Login with default credentials
- [ ] Change password

### **For Developers:**
- [ ] Install Node.js 18+
- [ ] Install Python 3.10+
- [ ] Run `npm install` in desktop directory
- [ ] Install Python dependencies
- [ ] Run `npm run dev`
- [ ] App opens automatically

---

## 🎯 **QUICK COMMANDS REFERENCE**

```bash
# Development
cd desktop
npm install
npm run dev

# Build
npm run build
npm run package

# Run installer
dist\UCOST Discovery Hub Setup 1.0.0.exe

# Run unpacked
dist\win-unpacked\UCOST Discovery Hub.exe

# Check logs
%APPDATA%\UCOST Discovery Hub\logs\
```

---

## 📚 **MORE INFORMATION**

- **README.md** - Complete overview
- **INSTALLATION.md** - Detailed setup guide
- **QUICK_START.md** - Quick reference
- **COMPLETE_ANALYSIS.md** - Full analysis

---

**🎉 Ready to run! Choose the method that works best for you!**

