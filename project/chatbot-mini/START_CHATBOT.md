# 🚀 How to Start Chatbot Service (Git Bash)

## Quick Start

### Option 1: Using Git Bash (Recommended)
```bash
cd project/chatbot-mini
npm install
npm run dev
```

### Option 2: Using the Startup Script
```bash
cd project/chatbot-mini
bash start-chatbot.sh
```

### Option 3: From Project Root
```bash
npm run dev:chatbot
```

## ✅ Verify It's Running

1. **Check Health:**
   ```bash
   curl http://localhost:4321/health
   ```

2. **Check Logs:**
   You should see:
   ```
   🤖 ========================================
      Chatbot Service Started Successfully!
      ========================================
      🌐 Listening on: http://localhost:4321
      ✅ Ready with X exhibits from CSV
   ```

## 🔧 Troubleshooting

### Issue: "Cannot find module 'csv-parse'"
**Solution:**
```bash
cd project/chatbot-mini
npm install csv-parse
```

### Issue: "CSV file not found"
**Solution:**
- Make sure `docs/exhibits.csv` exists in project root
- Or update the path in `server.ts`

### Issue: "Port 4321 already in use"
**Solution:**
```bash
# Find process using port 4321
netstat -ano | findstr :4321

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Issue: Service starts but doesn't respond
**Check:**
1. Look at terminal logs for errors
2. Verify CSV file loaded: Check for "✅ Ready with X exhibits from CSV"
3. Test health endpoint: `curl http://localhost:4321/health`

## 📝 Expected Startup Output

```
🤖 ========================================
   Chatbot Service Started Successfully!
   ========================================
   🌐 Listening on: http://localhost:4321
   🔗 Health Check: http://localhost:4321/health
   📡 Gemma AI: http://127.0.0.1:8011
   🗄️  Backend API: http://localhost:5000/api
   ========================================

[Chatbot] Loading CSV from: C:\...\docs\exhibits.csv
[Chatbot] ✅ Loaded X exhibits from CSV file
[Chatbot] ✅ Ready with X exhibits from CSV
```

## 🎯 Next Steps

Once the service is running:
1. Open your browser
2. Go to the frontend
3. Click the chatbot button
4. Ask questions like:
   - "tell me about taramandal"
   - "what space exhibits are there?"
   - "show me physics exhibits"

