# ✅ Chatbot CSV Integration - Complete!

## 🎯 What Was Implemented

The chatbot now uses a **CSV file** (`docs/exhibits.csv`) as the primary data source for all exhibit information. This makes it:

- ✅ **Faster** - No database queries needed
- ✅ **More Reliable** - Works even if backend API is down
- ✅ **More Accurate** - Direct matching from CSV data
- ✅ **Easier to Update** - Just update the CSV file

## 📋 CSV File Structure

The chatbot expects a CSV file at: `docs/exhibits.csv`

**Required Columns:**
- `id` - Unique exhibit identifier
- `name` - Exhibit name
- `description` - Full description
- `category` - Exhibit category
- `floor` - Floor location (optional)
- `ageRange` - Target age group (optional)
- `type` - Exhibit type (optional)
- `environment` - Indoor/Outdoor (optional)
- `features` - Interactive features (JSON array or comma-separated)

## 🔍 How It Works

### 1. **CSV Loading on Startup**
- Automatically loads `docs/exhibits.csv` when chatbot starts
- Tries multiple paths to find the file
- Logs success/failure with exhibit count

### 2. **Smart Search Algorithm**
When a question is asked:

1. **Direct Name Matching**
   - Searches exhibit names for exact or partial matches
   - Example: "taramandal" → finds "Taramandal" exhibit

2. **Keyword Matching**
   - Searches in name, category, and description
   - Example: "space" → finds space-related exhibits

3. **Category/Topic Matching**
   - Matches physics, biology, technology, etc.
   - Example: "physics exhibits" → finds physics category exhibits

4. **Special Handling**
   - Space/astronomy queries → prioritizes planetarium/taramandal
   - Exact name matches → highest priority

### 3. **Response Generation**
- Uses CSV data directly (no API calls needed)
- Generates human-friendly responses
- Returns accurate, complete information

### 4. **Fallback to Gemma AI**
- If CSV search finds no matches, falls back to Gemma AI
- This ensures all queries still get responses

## 🚀 Usage

### Start the Chatbot
```bash
cd project/chatbot-mini
npm install  # Install csv-parse dependency
npm run dev
```

### Check CSV Status
```bash
curl http://localhost:4321/health
```

Response includes:
```json
{
  "status": "ok",
  "csv": "loaded",
  "exhibitsCount": 114,
  ...
}
```

### Reload CSV (if updated)
```bash
curl -X POST http://localhost:4321/reload-csv
```

## 📊 Example Queries

### Direct Name Match
**Input:** "tell me about taramandal"  
**Process:**
1. Searches CSV for "taramandal" in name
2. Finds exact match
3. Returns full details from CSV

**Output:**
```
**Taramandal**

The Taramandal is a mini planetarium designed to bring the wonders of the night sky indoors...

Category: stars-and-planets
```

### Category Match
**Input:** "what physics exhibits are there?"  
**Process:**
1. Searches CSV for "physics" in category
2. Finds all physics exhibits
3. Returns list with descriptions

### Space-Related Query
**Input:** "tell me about space exhibit"  
**Process:**
1. Detects space-related keywords
2. Searches for planetarium/taramandal/space exhibits
3. Prioritizes space-related matches

## 🔧 Configuration

### CSV File Location
The chatbot tries these paths in order:
1. `docs/exhibits.csv` (from project root)
2. `../docs/exhibits.csv` (one level up)
3. Relative paths from chatbot directory

### Update CSV File
1. Edit `docs/exhibits.csv` with new exhibit data
2. Restart chatbot OR call `/reload-csv` endpoint
3. New data is immediately available

## ✅ Benefits

1. **No Database Dependency** - Works offline
2. **Fast Responses** - Instant CSV lookup
3. **Accurate Matching** - Direct name/category matching
4. **Easy Updates** - Just edit CSV file
5. **Complete Data** - All exhibit details from CSV

## 🎯 Result

The chatbot now:
- ✅ Uses CSV as primary data source
- ✅ Searches directly in CSV for fast, accurate results
- ✅ Falls back to Gemma AI if no CSV matches
- ✅ Provides human-friendly responses
- ✅ Works reliably without backend API

## 📝 Notes

- CSV file should be kept up-to-date with all exhibits
- If CSV is missing, chatbot falls back to API/Gemma
- CSV reload endpoint allows hot-reloading without restart
- All exhibit details come from CSV (name, description, category, etc.)

