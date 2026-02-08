# Chatbot Setup & Troubleshooting Guide

## ✅ Quick Start

1. **Start all services:**
   ```bash
   npm run dev:all
   ```
   
   This starts:
   - Backend API (port 5000)
   - Frontend (port varies)
   - Gemma AI Service (port 8011)
   - All other services

2. **Open your browser** and go to the welcome page
3. **Click the chatbot button** (floating button, bottom-right)
4. **Ask questions** about exhibits!

## 🔧 Setup Steps

### Step 1: Ensure Backend Has Exhibits

Make sure your backend database has exhibits. You can check by:
- Visiting the admin panel
- Or checking: `http://localhost:5000/api/exhibits`

### Step 2: Build/Rebuild Gemma Embeddings

If embeddings don't exist or need updating:

```bash
# Option 1: Rebuild from backend (recommended)
npm run gemma:rebuild

# Option 2: Build from existing dataset
cd gemma/scripts
python build_embeddings.py
```

This will:
- Fetch all exhibits from your backend
- Create training data
- Build FAISS embeddings
- Create the index file needed for searches

### Step 3: Verify Gemma Service

Test if the Gemma AI service is working:

```bash
npm run gemma:test
```

This will:
- Check if the service is running
- Test the `/health` endpoint
- Test the `/recommend` endpoint with sample queries

### Step 4: Start Services

```bash
# Start everything
npm run dev:all

# Or start individually:
npm run dev:backend    # Backend API (required)
npm run dev:frontend   # Frontend (required)
npm run dev:gemma      # Gemma AI (required for chatbot)
```

## 🐛 Troubleshooting

### Problem: "Cannot connect to AI service"

**Solution:**
1. Check if Gemma service is running:
   ```bash
   npm run dev:gemma
   ```
2. Verify it's accessible:
   - Open browser: `http://127.0.0.1:8011/health`
   - Should show: `{"status":"ok","indexed":true}`

### Problem: "Index not built"

**Solution:**
```bash
npm run gemma:rebuild
```

This fetches exhibits from your backend and rebuilds the embeddings.

### Problem: "No exhibits found" when asking questions

**Possible causes:**
1. **Backend has no exhibits** - Add exhibits via admin panel
2. **Embeddings not built** - Run `npm run gemma:rebuild`
3. **Exhibit IDs don't match** - Rebuild embeddings to sync IDs

**Solution:**
1. Make sure you have exhibits in the database
2. Rebuild embeddings: `npm run gemma:rebuild`
3. Restart Gemma service

### Problem: CORS errors in browser console

**Solution:**
- CORS is already enabled in the Gemma server
- Make sure you're using the updated `server.py` with CORS middleware
- Restart the Gemma service after any changes

### Problem: Backend API errors

**Solution:**
1. Check backend is running: `npm run dev:backend`
2. Verify API is accessible: `http://localhost:5000/api/exhibits`
3. Check backend logs for errors

## 📝 Testing the Chatbot

### Example Questions to Try:

- "Tell me about himalaya exhibits"
- "What physics exhibits are there?"
- "Show me interactive displays"
- "Where can I find biology exhibits?"
- "What exhibits are about space?"

### Check Browser Console (F12)

When testing, check the console for:
- Connection logs
- API responses
- Any error messages

Look for:
- `Querying Gemma AI at: http://127.0.0.1:8011/recommend`
- `Gemma response: {exhibits: [...]}`
- `Fetching details for exhibit IDs: ...`

## 🔄 Rebuilding Everything

If nothing works, rebuild from scratch:

```bash
# 1. Make sure backend is running and has exhibits
npm run dev:backend

# 2. Rebuild embeddings
npm run gemma:rebuild

# 3. Test the service
npm run gemma:test

# 4. Start everything
npm run dev:all
```

## 📊 Service URLs

- **Frontend**: Usually `http://localhost:5173` or `http://localhost:8080`
- **Backend API**: `http://localhost:5000/api`
- **Gemma AI**: `http://127.0.0.1:8011`

## 🎯 Health Check Endpoints

- **Gemma Health**: `http://127.0.0.1:8011/health`
- **Backend Exhibits**: `http://localhost:5000/api/exhibits`

Both should return JSON responses when working correctly.

