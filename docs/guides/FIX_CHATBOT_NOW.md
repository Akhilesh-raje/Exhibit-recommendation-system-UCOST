# 🔧 FIX CHATBOT - Do This NOW

## The Problem
Your chatbot has exhibit IDs in the embeddings (E001, E002...) that don't match your backend database IDs. This needs to be fixed.

## ✅ Solution (3 Steps)

### Step 1: Make sure backend has exhibits and is running
```bash
npm run dev:backend
```
Check: Visit `http://localhost:5000/api/exhibits` - you should see exhibits

### Step 2: Rebuild embeddings with REAL backend IDs
```bash
npm run gemma:rebuild
```

This will:
- Fetch exhibits from your ACTUAL backend database
- Use the REAL exhibit IDs from your database
- Rebuild embeddings that match your database

### Step 3: Start services and test
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Gemma AI
npm run dev:gemma

# Terminal 3: Frontend
npm run dev:frontend
```

OR use one command:
```bash
npm run dev:all
```

## 🧪 Test It

1. Open browser to frontend
2. Click chatbot button
3. Ask: "tell me about himalaya exhibits"
4. It should work now!

## ✅ What I Fixed

1. ✅ **CORS enabled** - Frontend can now connect to Gemma
2. ✅ **Created rows.json** - Maps index positions to exhibit IDs  
3. ✅ **Better error handling** - Shows clear error messages
4. ✅ **Health check** - Shows service status in chatbot header
5. ✅ **Timeout protection** - Won't hang forever
6. ✅ **Rebuild script** - `npm run gemma:rebuild` syncs with backend

## 🚨 If Still Not Working

Check browser console (F12) for errors. Common issues:

1. **Gemma service not running** → Start it: `npm run dev:gemma`
2. **Backend not running** → Start it: `npm run dev:backend`  
3. **Wrong IDs** → Rebuild: `npm run gemma:rebuild`
4. **No exhibits in backend** → Add some via admin panel first

## 📋 Quick Commands Reference

```bash
# Start everything
npm run dev:all

# Rebuild embeddings (if IDs don't match)
npm run gemma:rebuild

# Test Gemma service
npm run gemma:test

# Start individual services
npm run dev:backend
npm run dev:gemma
npm run dev:frontend
```

---

**The chatbot is now ready!** Just rebuild the embeddings to sync IDs, then start all services.

