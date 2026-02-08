# 🚀 UCOST Discovery Hub - Complete Setup Guide

## ⚡ Quick Start

### **Start Everything (All Services + Desktop App)**

```bash
npm run start:everything
```

This single command will:
1. ✅ Check prerequisites
2. ✅ Install dependencies (if needed)
3. ✅ Start all services in separate windows
4. ✅ Launch the desktop application

---

## 🔍 Complete System Analysis

### **Run Full Analysis**

```bash
npm run analyze
```

This comprehensive analysis checks:
- ✅ Prerequisites (Node.js 18+, Python 3.10+)
- ✅ All desktop app files
- ✅ All service directories
- ✅ All configuration files
- ✅ All dependencies
- ✅ Port availability
- ✅ Service health (if running)
- ✅ Build artifacts

**Expected Output:**
```
============================================================
  UCOST Discovery Hub - Complete System Analysis
============================================================

1. PREREQUISITES
  ✓ Node.js: v24.5.0 (Required: 18+)
  ✓ Python: Python 3.13.6 (Required: 3.10+)

2. DESKTOP APP STRUCTURE
  ✓ Main Electron process
  ✓ Configuration module
  ... (all 16 files checked)

3. SERVICE DIRECTORIES
  ✓ Backend service
  ✓ Frontend service
  ... (all 6 services checked)

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

## 📋 What Gets Started

When you run `npm run start:everything`, the following services start:

| Service | Port | Window Title | Description |
|---------|------|--------------|-------------|
| **Backend** | 5000 | UCOST Backend | REST API |
| **Frontend** | 5173 | UCOST Frontend | React Dev Server |
| **Embed** | 8001 | UCOST Embed Service | Text Embeddings |
| **Gemma** | 8011 | UCOST Gemma AI | AI Recommendations |
| **OCR** | 8088 | UCOST OCR Engine | Text Recognition |
| **Chatbot** | 4321 | UCOST Chatbot | AI Chatbot |
| **Desktop** | - | UCOST Discovery Hub | Electron App |

---

## 🌐 Service URLs

Once everything is running, access services at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Chatbot**: http://localhost:4321
- **Embed**: http://localhost:8001
- **Gemma**: http://localhost:8011
- **OCR**: http://localhost:8088

---

## 🔐 Default Login

**First Time Login:**
- **Email**: `admin@ucost.com`
- **Password**: `admin123`

⚠️ **IMPORTANT:** Change password immediately after first login!

---

## 📁 Files Created

### **Startup Scripts**
- `scripts/dev/start-everything.bat` - Windows batch script
- `scripts/dev/start-everything.ps1` - PowerShell script

### **Analysis Script**
- `desktop/scripts/analyze-everything.js` - Complete system analysis

### **Documentation**
- `START_EVERYTHING.md` - Quick start guide
- `desktop/COMPLETE_SYSTEM_ANALYSIS.md` - Detailed analysis
- `README_START_EVERYTHING.md` - This file

---

## 🎯 Usage Examples

### **Example 1: Start Everything**
```bash
npm run start:everything
```

### **Example 2: Run Analysis First**
```bash
# Check system status
npm run analyze

# If all checks pass, start everything
npm run start:everything
```

### **Example 3: Start Services Separately**
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Desktop App
npm run dev:desktop
```

---

## 🐛 Troubleshooting

### **Issue: Port Already in Use**
**Solution:**
- Stop the service using the port
- Or let the app auto-find an available port

### **Issue: Frontend Not Loading**
**Solution:**
```bash
# Start frontend dev server
npm run dev:frontend

# Or build frontend
npm run build:frontend
```

### **Issue: Python Services Not Starting**
**Solution:**
```bash
# Check Python version
python --version

# Install dependencies
cd project/embed-service
pip install -r requirements.txt

cd ../../gemma/infer
pip install -r requirements.txt
```

### **Issue: Analysis Shows Missing Dependencies**
**Solution:**
```bash
# Install all dependencies
npm run install:all

# Or install specific service
cd project/chatbot-mini
npm install
```

---

## ✅ Success Indicators

You'll know everything is working when:

- ✅ All service windows open without errors
- ✅ Desktop app launches successfully
- ✅ Frontend loads in the desktop app
- ✅ You can login with default credentials
- ✅ All features work correctly
- ✅ Analysis shows 100% success rate

---

## 📊 Analysis Results Interpretation

### **100% Success Rate**
✅ System is completely ready! You can start everything.

### **80-99% Success Rate**
⚠️ System is mostly ready. Check failed items and fix them.

### **Below 80% Success Rate**
❌ System needs attention. Fix failed items before proceeding.

---

## 🔄 Next Steps

1. **Run Analysis:**
   ```bash
   npm run analyze
   ```

2. **Fix Any Issues:**
   - Install missing dependencies
   - Fix configuration issues
   - Resolve port conflicts

3. **Start Everything:**
   ```bash
   npm run start:everything
   ```

4. **Access Application:**
   - Desktop app will open automatically
   - Or visit: http://localhost:5173

5. **Check Logs:**
   - Desktop logs: `%APPDATA%\UCOST Discovery Hub\logs\`
   - Service logs: Check individual service windows

---

## 📝 Additional Commands

### **Development Commands**
```bash
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run dev:desktop      # Start desktop app only
npm run dev:all          # Start all services (no desktop)
```

### **Build Commands**
```bash
npm run build            # Build all services
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only
```

### **Installation Commands**
```bash
npm run install:all      # Install all dependencies
```

---

**Ready to go!** 🎉

For more details, see:
- `START_EVERYTHING.md` - Quick start guide
- `desktop/COMPLETE_SYSTEM_ANALYSIS.md` - Complete analysis
- `desktop/README.md` - Desktop app documentation

