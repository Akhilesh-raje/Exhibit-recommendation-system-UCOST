# 🚀 START EVERYTHING - Quick Guide

## ⚡ One Command to Run Everything

### **Windows (Batch)**
```bash
npm run start:everything
```

### **Windows (PowerShell)**
```bash
npm run start:everything:ps1
```

### **Manual**
```bash
scripts\dev\start-everything.bat
```

---

## 🔍 Complete System Analysis

### **Run Full Analysis**
```bash
npm run analyze
```

This will check:
- ✅ Prerequisites (Node.js, Python)
- ✅ All files and directories
- ✅ Dependencies
- ✅ Port availability
- ✅ Service health (if running)
- ✅ Build artifacts

---

## 📋 What Gets Started

The `start-everything` script will:

1. **Check Prerequisites**
   - Node.js 18+
   - Python 3.10+

2. **Install Dependencies** (if needed)
   - Root dependencies
   - Desktop dependencies

3. **Start All Services** (in separate windows):
   - ✅ Backend (Port 5000)
   - ✅ Frontend (Port 5173)
   - ✅ Embed Service (Port 8001)
   - ✅ Gemma AI (Port 8011)
   - ✅ OCR Engine (Port 8088)
   - ✅ Chatbot (Port 4321)

4. **Launch Desktop App**
   - Waits 10 seconds for services to initialize
   - Opens Electron desktop application

---

## 🌐 Service URLs

Once everything is running:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Admin dashboard |
| **Backend API** | http://localhost:5000 | REST API |
| **Chatbot** | http://localhost:4321 | AI Chatbot |
| **Embed** | http://localhost:8001 | Text embeddings |
| **Gemma** | http://localhost:8011 | AI recommendations |
| **OCR** | http://localhost:8088 | Text recognition |

---

## 🔐 Default Login

**First Time:**
- **Email**: `admin@ucost.com`
- **Password**: `admin123`

⚠️ **Change password immediately after first login!**

---

## 📊 Analysis Results

After running `npm run analyze`, you'll see:

```
============================================================
  UCOST Discovery Hub - Complete System Analysis
============================================================

1. PREREQUISITES
  ✓ Node.js: v18.x.x (Required: 18+)
  ✓ Python: 3.10.x (Required: 3.10+)

2. DESKTOP APP STRUCTURE
  ✓ Main Electron process
  ✓ Configuration module
  ✓ Service manager
  ... (all files checked)

3. SERVICE DIRECTORIES
  ✓ Backend service
  ✓ Frontend service
  ... (all services checked)

4. CONFIGURATION FILES
  ✓ Backend package.json
  ✓ Frontend package.json
  ... (all configs checked)

5. DEPENDENCIES
  ✓ Desktop dependencies
  ✓ Backend dependencies
  ... (all deps checked)

6. PORT AVAILABILITY
  ✓ Port 5000 (Backend) - Available
  ✓ Port 5173 (Frontend) - Available
  ... (all ports checked)

7. SERVICE HEALTH CHECKS
  ✓ Backend - Responding (200)
  ✓ Chatbot - Responding (200)
  ... (all services checked)

8. BUILD ARTIFACTS
  ✓ Backend build
  ✓ Frontend build
  ... (all builds checked)

============================================================
  ANALYSIS SUMMARY
============================================================

  Total Checks: 50
  Passed: 50
  Failed: 0
  Success Rate: 100%

  ✓ System is 100% ready!
```

---

## 🐛 Troubleshooting

### **Port Already in Use**
- Stop the service using the port
- Or let the app auto-find an available port

### **Frontend Not Loading**
- Start frontend dev server: `npm run dev:frontend`
- Or build frontend: `npm run build:frontend`

### **Python Services Not Starting**
- Check Python version: `python --version`
- Install dependencies: `pip install -r requirements.txt`

### **Analysis Shows Errors**
- Fix missing files/dependencies
- Install missing packages
- Re-run analysis: `npm run analyze`

---

## 📝 Next Steps

1. **Run Analysis:**
   ```bash
   npm run analyze
   ```

2. **Start Everything:**
   ```bash
   npm run start:everything
   ```

3. **Access Application:**
   - Desktop app will open automatically
   - Or visit: http://localhost:5173

4. **Check Logs:**
   - Desktop logs: `%APPDATA%\UCOST Discovery Hub\logs\`
   - Service logs: Check individual service windows

---

## ✅ Success Indicators

You'll know everything is working when:

- ✅ All service windows open without errors
- ✅ Desktop app launches successfully
- ✅ Frontend loads in the desktop app
- ✅ You can login with default credentials
- ✅ All features work correctly

---

**Ready to go!** 🎉

