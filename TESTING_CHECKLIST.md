# 🧪 Testing Checklist - Desktop App

## ✅ Pre-Testing Verification

- [x] All fixes implemented (`app.isPackaged` instead of `NODE_ENV`)
- [x] Error handling added (blank page detection, load failure handling)
- [x] Frontend path detection fixed (`resources/frontend/dist`)
- [x] App packaged successfully

## 📋 Testing Steps

### Step 1: Test Unpacked EXE (Recommended First)

1. **Navigate to unpacked directory:**
   ```
   desktop\dist\win-unpacked\
   ```

2. **Run the executable:**
   - Double-click: `UCOST Discovery Hub.exe`
   - OR run from command line: `.\"UCOST Discovery Hub.exe"`

3. **Observe startup:**
   - ✅ Should see splash screen briefly
   - ✅ Window should appear (not blank)
   - ✅ Should either:
     - Load React app successfully, OR
     - Show error screen with details (NOT blank window)

### Step 2: Check What Happens

#### ✅ **SUCCESS CASE:**
- Splash screen appears
- Main window opens
- React app loads and displays UI
- No errors visible

#### ⚠️ **ERROR CASE (Improved):**
- Splash screen appears
- Main window opens
- **Error screen shows** (purple background, yellow warning icon)
- Error message includes:
  - What failed
  - Path checked
  - Instructions

#### ❌ **STILL BLANK:**
- Window opens but stays completely blank/dark
- No error screen appears
- This means we need to check DevTools

### Step 3: If Error Screen Appears

1. **Read the error message carefully:**
   - Copy the full error text
   - Note the path it checked
   - Note any specific error codes

2. **Open DevTools:**
   - Press `Ctrl + Shift + I`
   - Go to **Console** tab
   - Look for red errors
   - Copy any error messages

3. **Check Network tab:**
   - Go to **Network** tab
   - Refresh the page (`F5`)
   - See which files are loading/failing
   - Check if `vendor-react-*.js` loads first

### Step 4: If Still Blank Window

1. **Open DevTools immediately:**
   - Press `Ctrl + Shift + I`
   - Check **Console** tab for errors
   - Check **Network** tab for failed requests

2. **Check logs:**
   - Navigate to: `%LOCALAPPDATA%\UCOST Discovery Hub\logs\`
   - Open the most recent `.log` file
   - Look for errors related to:
     - Frontend path
     - Frontend server startup
     - Window loading

3. **Report findings:**
   - Screenshot of DevTools Console
   - Screenshot of DevTools Network
   - Copy of log file contents
   - Description of what you see

## 🔍 What to Look For

### Good Signs ✅
- Frontend server starts successfully
- `http://localhost:5173` loads
- React vendor bundles load in correct order
- No console errors
- UI renders correctly

### Bad Signs ❌
- Blank window (no content)
- Error screen with path issues
- Console errors about missing files
- Network errors (404s, CORS, etc.)
- Frontend server fails to start

## 📝 Reporting Results

After testing, report:

1. **What happened?**
   - [ ] App loaded successfully
   - [ ] Error screen appeared (with message)
   - [ ] Blank window (no error screen)

2. **If error screen:**
   - Copy the full error message
   - Note the path it checked

3. **If blank window:**
   - DevTools Console errors (screenshot or copy)
   - DevTools Network tab (which files failed)
   - Log file contents

4. **Any other observations:**
   - How long did splash screen show?
   - Did window appear quickly or slowly?
   - Any other visual issues?

## 🎯 Expected Outcome

After all fixes, the app should:
- ✅ Detect it's packaged (`app.isPackaged = true`)
- ✅ Find frontend at `resources/frontend/dist`
- ✅ Start frontend server on `http://localhost:5173`
- ✅ Load React app successfully
- ✅ Show UI or clear error message (NOT blank window)

---

**Ready to test!** Run the unpacked EXE and report what you see.

