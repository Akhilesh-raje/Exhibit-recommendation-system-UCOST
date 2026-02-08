# ✅ Chatbot Service Fixed - Now with Detailed Logging!

## 🔧 What Was Fixed

1. **Added chatbot service to startup scripts** - Now included in `npm run dev:all`
2. **Enhanced logging** - Detailed console logs for debugging
3. **Better error handling** - Clear error messages with troubleshooting steps
4. **Service startup verification** - Checks if port is available before starting

## 🚀 How to Start

### Option 1: Start Everything (Recommended)
```bash
npm run dev:all
```

This now includes the chatbot service automatically!

### Option 2: Start Chatbot Service Only
```bash
npm run dev:chatbot
```

### Option 3: Start Individual Services
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Gemma AI
npm run dev:gemma

# Terminal 3: Chatbot Service
npm run dev:chatbot

# Terminal 4: Frontend
npm run dev:frontend
```

## 📊 Logging & Monitoring

The chatbot service now provides detailed logging:

### Startup Logs
When the service starts, you'll see:
```
🤖 ========================================
   Chatbot Service Started Successfully!
   ========================================
   🌐 Listening on: http://localhost:4321
   🔗 Health Check: http://localhost:4321/health
   📡 Gemma AI: http://127.0.0.1:8011
   🗄️  Backend API: http://localhost:5000/api
   ========================================
```

### Request Logs
Every request is logged:
```
[2024-01-01T12:00:00.000Z] POST /chat
  Body: {"message":"tell me about physics exhibits"}...
```

### Processing Logs
When processing a question:
```
[Chatbot] ========================================
[Chatbot] Processing question: "tell me about physics exhibits"
[Chatbot] ========================================
[Chatbot] Querying Gemma AI at: http://127.0.0.1:8011/recommend
[Chatbot] Gemma AI response status: 200
[Chatbot] ✅ Found 5 recommendations from Gemma AI
[Chatbot] Top recommendations: exhibit-id-1 (0.856), exhibit-id-2 (0.743), exhibit-id-3 (0.692)
[Chatbot] Fetching details for 5 exhibits from: http://localhost:5000/api
[Chatbot] Exhibit IDs: exhibit-id-1, exhibit-id-2, exhibit-id-3, exhibit-id-4, exhibit-id-5
[Chatbot] ✅ Fetched exhibit: Physics Exhibit 1 (score: 0.856)
[Chatbot] ✅ Fetched exhibit: Physics Exhibit 2 (score: 0.743)
[Chatbot] ✅ Successfully fetched 5/5 exhibit details
[Chatbot] Generated answer with confidence: 0.85
[Chatbot] Processing time: 1234ms
[Chatbot] Found 5 exhibits
[Chatbot] ========================================
```

### Error Logs
Errors are clearly marked:
```
[Chatbot] ❌ Gemma AI error: index not built
[Chatbot] ⚠️  Failed to fetch exhibit exhibit-id-1: 404 Not Found
[Chatbot] ❌ Error fetching exhibit exhibit-id-2: Connection timeout
```

## 🔍 Health Check

Check if the service is running:
```bash
curl http://localhost:4321/health
```

Response:
```json
{
  "status": "ok",
  "gemma": "online",
  "api": "online",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🐛 Troubleshooting

### Service Won't Start

**Error: Port 4321 already in use**
```
❌ Failed to start chatbot service on port 4321:
   Error: listen EADDRINUSE: address already in use :::4321
   Port 4321 is already in use.
```

**Solution:**
1. Find what's using port 4321:
   ```bash
   # Windows
   netstat -ano | findstr :4321
   
   # Kill the process (replace PID with actual process ID)
   taskkill /PID <PID> /F
   ```

2. Or change the port:
   ```bash
   # Set environment variable
   $env:PORT=4322
   npm run dev:chatbot
   ```

### Service Starts But Can't Connect

**Check logs for:**
- ✅ Service started successfully
- ✅ Can connect to Gemma AI
- ✅ Can connect to Backend API

**If Gemma AI is offline:**
```bash
npm run dev:gemma
```

**If Backend API is offline:**
```bash
npm run dev:backend
```

### No Exhibits Found

**Check logs for:**
```
[Chatbot] ✅ Found 0 recommendations from Gemma AI
```

**Solution:**
1. Rebuild embeddings:
   ```bash
   npm run gemma:rebuild
   ```

2. Make sure backend has exhibits:
   ```bash
   curl http://localhost:5000/api/exhibits
   ```

## 📝 New Scripts Added

- `npm run dev:chatbot` - Start chatbot service only
- `npm run dev:all` - Now includes chatbot service

## 🎯 What to Look For in Logs

When testing the chatbot, watch for:

1. **Service startup** - Should see "Chatbot Service Started Successfully!"
2. **Health check** - Should show gemma and api as "online"
3. **Request received** - Should see POST /chat logs
4. **Gemma AI response** - Should see "Found X recommendations"
5. **Exhibit fetching** - Should see "Successfully fetched X/Y exhibit details"
6. **Answer generated** - Should see confidence score and processing time

## ✅ Verification Checklist

- [ ] Chatbot service starts without errors
- [ ] Health check returns `{"status":"ok","gemma":"online","api":"online"}`
- [ ] Logs show detailed request processing
- [ ] Can send questions and get responses
- [ ] Logs show exhibit fetching and answer generation

## 🎉 Result

The chatbot service now:
- ✅ Starts automatically with `npm run dev:all`
- ✅ Provides detailed logging for debugging
- ✅ Shows clear error messages
- ✅ Verifies dependencies (Gemma AI, Backend API)
- ✅ Logs all request processing steps

You can now easily diagnose issues by checking the terminal logs!


