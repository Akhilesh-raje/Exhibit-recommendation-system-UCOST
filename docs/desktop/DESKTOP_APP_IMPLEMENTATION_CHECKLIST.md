# 🚀 Desktop App Implementation Checklist

**Quick Reference Guide for Implementing Single-Click Installer**

---

## 📋 Phase 1: Python Runtime Integration

### Step 1.1: Create Consolidated Requirements File
- [ ] Create `desktop/requirements/requirements.txt`
- [ ] Merge all Python service requirements:
  - `project/embed-service/requirements.txt`
  - `gemma/infer/` dependencies (from README)
  - `project/ocr-engine/requirements.txt`
  - `ml/requirements.txt` (if needed)
- [ ] Resolve version conflicts
- [ ] Test installation: `pip install -r requirements.txt`

**File Location:** `desktop/requirements/requirements.txt`

### Step 1.2: Create Python Setup Script
- [ ] Create `desktop/scripts/setup-python.js`
- [ ] Implement Python detection logic
- [ ] Add bundled Python path support
- [ ] Create virtual environment
- [ ] Return Python executable path
- [ ] Add error handling

**Key Functions:**
```javascript
- detectPython() - Find system Python
- createVirtualEnv() - Create venv
- getPythonExecutable() - Return path
```

### Step 1.3: Create Dependency Installer
- [ ] Create `desktop/scripts/install-dependencies.js`
- [ ] Read requirements.txt
- [ ] Install via pip in virtual environment
- [ ] Show progress
- [ ] Handle errors gracefully
- [ ] Verify installation

**Key Functions:**
```javascript
- installDependencies(pythonExe, requirementsPath)
- showProgress(current, total)
- verifyInstallation(pythonExe)
```

### Step 1.4: Update Service Manager
- [ ] Update `desktop/src/service-manager.js`
- [ ] Modify `getPythonExecutable()` to check:
  1. Bundled Python in venv
  2. System Python
  3. Error with instructions
- [ ] Add virtual environment support
- [ ] Test Python service startup

**Code Changes:**
```javascript
getPythonExecutable() {
  // Check bundled Python first
  const bundledPython = path.join(
    process.resourcesPath, 
    'venv', 
    'Scripts', 
    'python.exe'
  );
  if (fs.existsSync(bundledPython)) {
    return bundledPython;
  }
  // Fallback to system Python
  // ...
}
```

### Step 1.5: Update Configuration
- [ ] Update `desktop/src/config.js`
- [ ] Add `getPythonConfig()` function
- [ ] Add Python paths to service configs
- [ ] Update environment variables

---

## 📋 Phase 2: NSIS Installer Enhancement

### Step 2.1: Create Pre-Install Checks
- [ ] Create `desktop/build/installer-checks.nsh`
- [ ] Check Windows version (10+)
- [ ] Check disk space (3GB minimum)
- [ ] Check port availability
- [ ] Check for existing installation
- [ ] Check Python (if not bundling)

**NSIS Script:**
```nsis
!include "installer-checks.nsh"

Function .onInit
  Call CheckWindowsVersion
  Call CheckDiskSpace
  Call CheckPorts
  Call CheckExistingInstall
FunctionEnd
```

### Step 2.2: Integrate Python Setup
- [ ] Add Python extraction to installer
- [ ] Add virtual environment creation
- [ ] Add dependency installation step
- [ ] Add progress indicators
- [ ] Handle installation errors

**NSIS Script:**
```nsis
Section "Python Setup"
  ; Extract Python runtime
  ; Create virtual environment
  ; Install dependencies
SectionEnd
```

### Step 2.3: Create Post-Install Scripts
- [ ] Create `desktop/scripts/post-install.js`
- [ ] Initialize database
- [ ] Seed admin user
- [ ] Verify services
- [ ] Create configuration files
- [ ] Show welcome screen

### Step 2.4: Update electron-builder Config
- [ ] Update `desktop/package.json` build section
- [ ] Add Python runtime to `extraResources`
- [ ] Add NSIS scripts
- [ ] Configure installation steps
- [ ] Add custom installer pages

**package.json:**
```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "include": "build/installer.nsh",
      "script": "build/installer-script.nsh"
    },
    "extraResources": [
      {
        "from": "resources/python",
        "to": "python"
      }
    ]
  }
}
```

---

## 📋 Phase 3: Automated Setup & Verification

### Step 3.1: Create Verification Script
- [ ] Create `desktop/scripts/verify-installation.js`
- [ ] Check Python installation
- [ ] Verify Python packages
- [ ] Test service startup
- [ ] Check database
- [ ] Generate report

**Key Checks:**
```javascript
- verifyPython()
- verifyPackages()
- testServices()
- checkDatabase()
- generateReport()
```

### Step 3.2: Create Post-Install Automation
- [ ] Create `desktop/scripts/post-install.js`
- [ ] Run database migrations
- [ ] Seed initial data
- [ ] Create admin user
- [ ] Test all endpoints
- [ ] Show status

### Step 3.3: Add Welcome Screen
- [ ] Create welcome screen component
- [ ] Show installation status
- [ ] Display service health
- [ ] Provide next steps
- [ ] Add troubleshooting links

---

## 📋 Phase 4: Testing & Polish

### Step 4.1: Clean System Testing
- [ ] Test on Windows 10 (clean install)
- [ ] Test on Windows 11 (clean install)
- [ ] Test without Python pre-installed
- [ ] Test with Python pre-installed
- [ ] Test with different Python versions

### Step 4.2: Service Testing
- [ ] Test backend startup
- [ ] Test chatbot startup
- [ ] Test embed service startup
- [ ] Test gemma service startup
- [ ] Test OCR service startup
- [ ] Test all services together

### Step 4.3: Error Scenario Testing
- [ ] Test with insufficient disk space
- [ ] Test with port conflicts
- [ ] Test with missing dependencies
- [ ] Test with corrupted files
- [ ] Test installation cancellation

### Step 4.4: Performance Testing
- [ ] Measure installation time
- [ ] Measure startup time
- [ ] Test memory usage
- [ ] Test CPU usage
- [ ] Optimize slow components

---

## 📋 Phase 5: Documentation

### Step 5.1: Installation Guide
- [ ] Create `desktop/INSTALLATION.md`
- [ ] System requirements
- [ ] Installation steps
- [ ] Troubleshooting
- [ ] FAQ

### Step 5.2: User Manual
- [ ] Create `desktop/USER_MANUAL.md`
- [ ] Getting started
- [ ] Features overview
- [ ] Common tasks
- [ ] Advanced usage

### Step 5.3: Developer Guide
- [ ] Create `desktop/DEVELOPER.md`
- [ ] Architecture overview
- [ ] Service management
- [ ] Configuration
- [ ] Debugging

---

## 🔧 Quick Implementation Scripts

### Script 1: Create Consolidated Requirements
```bash
# Run from project root
cat project/embed-service/requirements.txt > desktop/requirements/requirements.txt
echo "" >> desktop/requirements/requirements.txt
echo "# Gemma dependencies" >> desktop/requirements/requirements.txt
echo "torch>=2.0.0" >> desktop/requirements/requirements.txt
echo "transformers>=4.30.0" >> desktop/requirements/requirements.txt
echo "faiss-cpu>=1.7.0" >> desktop/requirements/requirements.txt
# ... add more
```

### Script 2: Test Python Setup
```javascript
// desktop/scripts/test-python-setup.js
const { execSync } = require('child_process');
const pythonExe = 'python'; // or bundled path
try {
  execSync(`${pythonExe} --version`);
  console.log('✅ Python found');
  execSync(`${pythonExe} -m pip --version`);
  console.log('✅ pip found');
} catch (error) {
  console.error('❌ Python setup failed:', error.message);
}
```

### Script 3: Test Service Startup
```javascript
// desktop/scripts/test-services.js
const ServiceManager = require('../src/service-manager');
const config = require('../src/config').getServiceConfig();

async function testServices() {
  const manager = new ServiceManager();
  for (const [name, serviceConfig] of Object.entries(config)) {
    try {
      await manager.startService(name, serviceConfig);
      console.log(`✅ ${name} started`);
    } catch (error) {
      console.error(`❌ ${name} failed:`, error.message);
    }
  }
}
```

---

## ✅ Pre-Implementation Checklist

Before starting implementation, ensure:

- [ ] All source code is committed
- [ ] Current build works in development
- [ ] All services tested individually
- [ ] Database schema is finalized
- [ ] Python version requirements decided (3.10+)
- [ ] Bundling strategy decided (Option A/B/C)
- [ ] Testing environment prepared
- [ ] Backup of current working state

---

## 🎯 Success Metrics

Track these metrics during implementation:

1. **Installation Success Rate:** >95%
2. **Installation Time:** <15 minutes
3. **Service Startup Success:** 100%
4. **First Run Success:** >90%
5. **User Satisfaction:** Positive feedback

---

## 📞 Support & Resources

- **Electron Builder Docs:** https://www.electron.build/
- **NSIS Docs:** https://nsis.sourceforge.io/Docs/
- **Python Embeddable:** https://www.python.org/downloads/windows/
- **Project Issues:** Check GitHub issues
- **Team Chat:** Use project communication channel

---

**Last Updated:** December 2024  
**Status:** Ready for Implementation

