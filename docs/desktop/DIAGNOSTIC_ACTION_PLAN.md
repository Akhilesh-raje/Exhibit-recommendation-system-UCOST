# 🔍 Diagnostic Action Plan - Step by Step

## Current Situation

✅ **What's Working:**
- Web app works perfectly (frontend + backend separately)
- Electron installer works
- Services can start
- Error screen HTML encoding fixed

❌ **What's Broken:**
- Desktop app shows blank white screen
- Console shows nothing (because error screen was broken, now fixed)
- React app never loads

---

## 🎯 Action Plan - Do This Now

### **Step 1: Rebuild Desktop App with Fixed Error Screen**

```bash
cd desktop
npm run package
```

**Why:** The fixed `window-manager.js` needs to be packaged into the installer.

---

### **Step 2: Install & Run the New Build**

1. Install the new `.exe` installer
2. Run the installed app
3. **You should now see an ERROR SCREEN** (not blank white) with actual error message

---

### **Step 3: Capture the Error Message**

**What to look for:**
- Error screen should show:
  - ⚠️ Application Error heading
  - Code block with error details
  - Path information
  - Log file location

**Take a screenshot** or **copy the error text** and share it.

---

### **Step 4: Check Logs (If Error Screen Shows Log Path)**

The error screen will tell you where logs are. Usually:
```
C:\Users\<YourUsername>\AppData\Roaming\UCOST Discovery Hub\logs\app-YYYY-MM-DD.log
```

**Open that log file** and look for:
- `Frontend path:` messages
- `Loading from:` messages
- Any `ERROR` or `WARN` messages about frontend

---

## 🔧 Most Likely Issues & Quick Fixes

Based on the architecture, here are the **3 most common causes**:

### **Issue #1: Frontend Not Found**
**Symptoms:** Error says "Frontend directory not found" or "index.html not found"

**Fix:**
```bash
# 1. Make sure frontend is built
cd project/frontend/ucost-discovery-hub
npm run build

# 2. Check if dist folder exists
ls dist  # Should show index.html and assets/

# 3. Verify it's being copied to resources in package.json
# Check desktop/package.json -> extraResources -> frontend/dist
```

---

### **Issue #2: Wrong Asset Paths (Vite base path)**
**Symptoms:** Error shows 404s for `/assets/...` or `file://` protocol issues

**Fix:**
```typescript
// project/frontend/ucost-discovery-hub/vite.config.ts
export default defineConfig({
  base: './',  // ✅ MUST be './' for Electron file:// protocol
  // ... rest of config
})
```

Then rebuild frontend:
```bash
cd project/frontend/ucost-discovery-hub
npm run build
```

---

### **Issue #3: Frontend Server Not Starting**
**Symptoms:** Error says "Frontend server failed" or port conflict

**Fix:**
- Check if port 5173 is already in use
- Check `frontend-server.js` logs
- Verify `frontend/dist` folder exists at expected path

---

## 📋 Diagnostic Checklist

After Step 2, check these:

- [ ] **Error screen shows actual error** (not blank)
- [ ] **Error message is readable** (not encoded gibberish)
- [ ] **Path information is shown** (where Electron looked for frontend)
- [ ] **Log file path is shown** (where to check detailed logs)

---

## 🚀 After We See the Error

Once you share the error message, I'll:

1. **Identify the exact root cause** (path issue, build issue, server issue, etc.)
2. **Give you a targeted fix** (not a big refactor)
3. **Verify the fix works** before moving on

---

## 💡 Quick Test (Optional)

If you want to test the error screen fix immediately without rebuilding:

```bash
cd desktop
# Run in dev mode to test error screen
NODE_ENV=production npm start
```

But you'll still need to rebuild for production.

---

## 🎯 Expected Outcome

After following this plan:

1. ✅ You'll see the **actual error** (not blank screen)
2. ✅ We'll know **exactly what's wrong**
3. ✅ I'll give you a **precise fix**
4. ✅ Your app will **load correctly**

---

**Next Step:** Rebuild the desktop app and share the error message you see! 🚀

