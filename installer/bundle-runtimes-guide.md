# Portable Runtimes Bundling Guide

## Overview

This guide explains how to bundle portable Node.js and Python with the UCOST Discovery Hub desktop application, eliminating the need for users to install these dependencies.

## Quick Start

### Step 1: Download Portable Runtimes

Run the setup script:

```powershell
cd installer
.\setup-portable-runtimes.ps1
```

This will download:
- **Node.js Portable** (~50MB) - Node.js v20.11.0
- **Python Portable** (~500MB) - Python 3.11.7 with AI/ML packages

Output location: `installer/portable-runtimes/`

### Step 2: Copy to Desktop Resources

```powershell
# Copy portable runtimes to desktop resources
Copy-Item -Recurse installer\portable-runtimes\* desktop\resources\runtimes\
```

### Step 3: Update Packaging Config

Add to `desktop/packaging-config.json` in the `extraResources` array:

```json
{
  "from": "resources/runtimes/node-portable",
  "to": "runtimes/node-portable",
  "filter": ["**/*"]
},
{
  "from": "resources/runtimes/python-portable",
  "to": "runtimes/python-portable",
  "filter": ["**/*"]
}
```

### Step 4: Update Auto-Installer

The `auto-installer.js` will automatically detect bundled runtimes in the packaged app.

Add this detection logic:

```javascript
detectBundledRuntimes() {
  const runtimesPath = path.join(this.resourcesPath, 'runtimes');
  
  const bundledNode = path.join(runtimesPath, 'node-portable', 'node.exe');
  const bundledPython = path.join(runtimesPath, 'python-portable', 'python.exe');
  
  return {
    node: fs.existsSync(bundledNode) ? bundledNode : null,
    python: fs.existsSync(bundledPython) ? bundledPython : null
  };
}
```

## Size Impact

| Component | Size | Purpose |
|-----------|------|---------|
| Node.js Portable | ~50MB | Run backend/chatbot |
| Python Portable | ~500MB | AI services (embed, gemma, OCR) |
| **Total** | **~550MB** | Full self-contained app |

## Trade-offs

### With Bundled Runtimes ✅
- **Pros:**
  - Zero dependencies - works out of the box
  - Consistent versions across all installations
  - No user configuration needed
  
- **Cons:**
  - Larger download size (~550MB extra)
  - Longer first-time extraction

### Without Bundled Runtimes ⚠️
- **Pros:**
  - Smaller download size
  - Faster extraction
  
- **Cons:**
  - Users must install Node.js manually
  - Python services won't work without user Python install
  - Version inconsistencies possible

## Recommendation

**For Public Distribution:** Bundle both runtimes  
**For Development/Internal:** Skip bundling (faster iteration)

## Testing Bundled Runtimes

After bundling, test on a clean Windows machine:

1. Ensure Node.js and Python are NOT installed
2. Run the packaged EXE
3. Verify backend starts using bundled Node.js
4. Verify Python services start using bundled Python

## Alternative: Hybrid Approach

You can also implement a hybrid approach:

1. Check for system Node.js/Python first
2. Fall back to bundled versions if not found

This gives the best of both worlds - smaller size for users with existing installations, full functionality for everyone else.

---

**Created:** February 2026  
**For:** UCOST Discovery Hub v1.0
