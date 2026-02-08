# 🔧 Blank Screen Fix

## Problem
The Electron app opens but shows a blank white screen. The Developer Tools show an empty `<body>` tag.

## Root Cause
The frontend files weren't being found in production because:
1. Path resolution was incorrect for `process.resourcesPath`
2. Frontend server wasn't starting properly
3. Fallback to `file://` protocol wasn't working

## Fixes Applied

### 1. Fixed Frontend Path Resolution (`desktop/src/config.js`)
- **Before**: Complex path resolution that didn't work in production
- **After**: Clear separation between dev and production paths
- **Production**: Uses `process.resourcesPath` which points to the `resources` folder where `extraResources` are placed

### 2. Enhanced Frontend Server Startup (`desktop/main.js`)
- Added path existence check before starting server
- Better error logging with path information
- Sets `frontendConfig.url` when server starts successfully

### 3. Improved Window Loading (`desktop/src/window-manager.js`)
- **Priority 1**: Use frontend server URL if available
- **Priority 2**: Try loading from file directly
- **Priority 3**: Fallback to default port
- Better error messages

## Testing

After rebuilding, the app should:
1. ✅ Find frontend files in `resources/frontend/dist`
2. ✅ Start Express server to serve frontend
3. ✅ Load frontend from `http://localhost:5173` (or next available port)
4. ✅ Display the application UI instead of blank screen

## Next Steps

1. **Rebuild the application:**
   ```bash
   cd desktop
   npm run package
   ```

2. **Test the installer:**
   - Install from `dist/UCOST Discovery Hub Setup 1.0.0.exe`
   - Launch the app
   - Should see the application UI, not blank screen

3. **Check logs if still blank:**
   - Logs will show the frontend path being checked
   - Will show if server started successfully
   - Will show which URL/file is being loaded

## Files Modified
- `desktop/src/config.js` - Fixed path resolution
- `desktop/main.js` - Enhanced frontend server startup
- `desktop/src/window-manager.js` - Improved loading logic

