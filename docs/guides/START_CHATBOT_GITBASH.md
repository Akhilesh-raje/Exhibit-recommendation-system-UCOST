# 🚀 Start Chatbot Service - Git Bash Instructions

## Step-by-Step (Use Git Bash)

### 1. Open Git Bash
Open Git Bash terminal in your project directory.

### 2. Navigate to Chatbot Directory
```bash
cd project/chatbot-mini
```

### 3. Install Dependencies (if not done)
```bash
npm install
```

This will install:
- express
- cors
- csv-parse (for reading CSV file)

### 4. Start the Service
```bash
npm run dev
```

### 5. Verify It's Running
You should see output like:
```
🤖 ========================================
   Chatbot Service Started Successfully!
   ========================================
   🌐 Listening on: http://localhost:4321
   [Chatbot] Loading CSV from: ...
   [Chatbot] ✅ Loaded X exhibits from CSV file
   [Chatbot] ✅ Ready with X exhibits from CSV
```

### 6. Test the Service
In another terminal (or browser):
```bash
curl http://localhost:4321/health
```

Should return:
```json
{
  "status": "ok",
  "csv": "loaded",
  "exhibitsCount": 114,
  ...
}
```

## ✅ Quick Commands

**Start chatbot:**
```bash
cd project/chatbot-mini && npm run dev
```

**Check if running:**
```bash
curl http://localhost:4321/health
```

**Start all services:**
```bash
npm run dev:all
```

## 🔧 If Service Won't Start

### Check for Errors
Look at the terminal output for:
- ❌ Module not found errors
- ❌ Port already in use
- ❌ CSV file not found

### Common Fixes

**1. Install missing dependencies:**
```bash
cd project/chatbot-mini
npm install
```

**2. Port already in use:**
```bash
# Find what's using port 4321
netstat -ano | grep 4321

# Kill the process (Windows)
taskkill /PID <PID> /F
```

**3. CSV file not found:**
- Make sure `docs/exhibits.csv` exists
- Check the path in terminal logs

## 📝 What the Service Does

1. ✅ Loads all exhibits from `docs/exhibits.csv`
2. ✅ Searches CSV data for fast, accurate responses
3. ✅ Provides human-friendly answers
4. ✅ Falls back to Gemma AI if CSV has no matches

## 🎯 Once Running

The chatbot will:
- Respond to greetings naturally
- Find exhibits by name (e.g., "taramandal")
- Find exhibits by topic (e.g., "astronomy", "space")
- Provide accurate, complete information from CSV

Try asking:
- "tell me about taramandal"
- "what astronomy exhibits are there?"
- "show me space exhibits"

