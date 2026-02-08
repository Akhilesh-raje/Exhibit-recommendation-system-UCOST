# 🚀 Quick Start: Get Chatbot Working NOW

## ✅ Step-by-Step Setup (Do This Now!)

### 1. Start Backend First
```bash
npm run dev:backend
```
Wait until it says "Server running on port 5000"

### 2. Rebuild Gemma Embeddings with Real Backend Data
```bash
npm run gemma:rebuild
```
This will:
- Fetch all exhibits from your backend database
- Use the REAL exhibit IDs (not E001, E002, etc.)
- Build embeddings that match your actual database

### 3. Start Gemma AI Service
```bash
npm run dev:gemma
```
Wait until it says "Uvicorn running on http://0.0.0.0:8011"

### 4. Start Frontend
```bash
npm run dev:frontend
```

### 5. Test the Chatbot
- Open your browser to the frontend URL
- Click the floating chatbot button (bottom-right)
- Ask: "tell me about himalaya exhibits"

## 🔍 Verify Everything Works

### Test Gemma Service:
```bash
npm run gemma:test
```

Should show:
- ✅ Health check passed
- ✅ Recommendation successful with exhibits found

### Check Browser Console (F12):
When you ask a question, you should see:
- `Querying Gemma AI at: http://127.0.0.1:8011/recommend`
- `Gemma response: {exhibits: [...]}`
- `Fetching details for exhibit IDs: ...`

## ⚠️ Common Issues & Fixes

### Issue: "Index not built"
**Fix:** Run `npm run gemma:rebuild`

### Issue: "Cannot connect to AI service"
**Fix:** 
1. Start Gemma: `npm run dev:gemma`
2. Check it's running: Visit `http://127.0.0.1:8011/health`

### Issue: "No exhibits found" or wrong IDs
**Fix:**
1. Make sure backend has exhibits
2. Run: `npm run gemma:rebuild` (this syncs IDs)

### Issue: Backend API errors when fetching exhibit details
**Fix:**
1. Make sure backend is running: `npm run dev:backend`
2. Check: `http://localhost:5000/api/exhibits`

## 🎯 One-Command Start (After Setup)

Once everything is set up, you can start everything with:

```bash
npm run dev:all
```

This starts ALL services including the chatbot!

## 📝 What Was Fixed

1. ✅ Added CORS to Gemma server (allows frontend requests)
2. ✅ Created missing `rows.json` file (maps indexes to exhibit IDs)
3. ✅ Improved error handling with clear messages
4. ✅ Added health check status indicator
5. ✅ Fixed timeout compatibility
6. ✅ Added scripts to rebuild/test embeddings
7. ✅ Made server handle missing rows.json gracefully

## 🔄 If Still Not Working

1. **Check backend has exhibits:**
   - Visit admin panel
   - Or check: `http://localhost:5000/api/exhibits`

2. **Rebuild everything:**
   ```bash
   npm run gemma:rebuild
   npm run gemma:test
   ```

3. **Check all services are running:**
   - Backend: `http://localhost:5000/api/exhibits`
   - Gemma: `http://127.0.0.1:8011/health`

4. **Check browser console (F12)** for detailed errors

