# 🔍 Root Cause Analysis - Nested Resources Folder Issue

## The Problem

Frontend files end up at: `resources/resources/frontend/dist` (nested)
Instead of: `resources/frontend/dist` (expected)

## Root Cause

### How Electron Builder Processes `extraResources`

When you specify `extraResources` in `package.json`, Electron Builder:

1. **Automatically creates a `resources` folder** next to the executable
2. **Places ALL `extraResources` inside this `resources` folder**
3. **Uses the `"to"` path RELATIVE to the `resources` folder**

### The Configuration Error

**Current Configuration (WRONG):**
```json
{
  "from": "../project/frontend/ucost-discovery-hub/dist",
  "to": "resources/frontend/dist"  // ❌ WRONG - includes "resources/"
}
```

**What Happens:**
1. Electron Builder creates: `resources/` folder
2. Then places files at: `resources/` + `"resources/frontend/dist"` 
3. Result: `resources/resources/frontend/dist` ❌

### Why This Happens

The `"to"` path in `extraResources` is **relative to the resources folder**, NOT an absolute path.

**Electron Builder's Logic:**
```
Final Path = <resources_folder>/<to_path>
          = resources/ + resources/frontend/dist
          = resources/resources/frontend/dist  ❌
```

## The Correct Configuration

**Should Be:**
```json
{
  "from": "../project/frontend/ucost-discovery-hub/dist",
  "to": "frontend/dist"  // ✅ CORRECT - NO "resources/" prefix
}
```

**What Would Happen:**
1. Electron Builder creates: `resources/` folder
2. Then places files at: `resources/` + `"frontend/dist"`
3. Result: `resources/frontend/dist` ✅

## Why It's Not Fixed Yet

The current fix is a **workaround** that:
- ✅ Checks multiple paths (including nested)
- ✅ Works with current build structure
- ✅ Doesn't require rebuilding

But the **proper fix** would be:
- Update `package.json` to remove `"resources/"` from all `"to"` paths
- Rebuild the application
- Files will be in correct location

## All Affected Entries

These all have the same issue:

```json
{
  "to": "resources/backend/dist",      // ❌ Should be "backend/dist"
  "to": "resources/backend/prisma",   // ❌ Should be "backend/prisma"
  "to": "resources/frontend/dist",    // ❌ Should be "frontend/dist"
  "to": "resources/chatbot/dist",     // ❌ Should be "chatbot/dist"
  "to": "resources/embed-service",     // ❌ Should be "embed-service"
  "to": "resources/gemma/infer",       // ❌ Should be "gemma/infer"
  "to": "resources/ocr-engine",         // ❌ Should be "ocr-engine"
  "to": "resources/data/exhibits.csv"   // ❌ Should be "data/exhibits.csv"
}
```

## Electron Builder Documentation

According to Electron Builder docs:
- `extraResources`: Files placed in `resources` folder (outside app.asar)
- The `"to"` path is **relative to the resources folder**
- You should NOT include "resources/" in the `"to"` path

## Solution Options

### Option 1: Fix Configuration (Recommended for Future)
Update `package.json` to remove "resources/" from all `"to"` paths:
```json
"extraResources": [
  {
    "from": "../project/frontend/ucost-discovery-hub/dist",
    "to": "frontend/dist"  // ✅ Fixed
  }
  // ... fix all others
]
```

**Pros:**
- ✅ Correct structure
- ✅ Matches Electron Builder conventions
- ✅ Cleaner paths

**Cons:**
- ❌ Requires rebuilding
- ❌ Current builds won't work

### Option 2: Keep Workaround (Current)
Keep the path checking logic that handles nested structure.

**Pros:**
- ✅ Works with current builds
- ✅ No rebuild needed
- ✅ Handles both structures

**Cons:**
- ❌ Not the "correct" structure
- ❌ More complex path resolution

## Recommendation

**For Now:** Keep the workaround (already implemented)
- App works correctly
- Handles nested structure
- No immediate action needed

**For Future Builds:** Fix the configuration
- Update `package.json` 
- Remove "resources/" from all `"to"` paths
- Rebuild application
- Remove workaround code (optional)

## Summary

**Root Cause:** Including `"resources/"` in the `"to"` path of `extraResources` causes Electron Builder to create a nested structure because it already places everything in a `resources` folder.

**Fix Applied:** Path resolution now checks multiple locations including the nested path.

**Proper Fix:** Remove `"resources/"` prefix from all `"to"` paths in `extraResources` configuration.

---

**Status:** ✅ Workaround implemented, root cause identified, proper fix documented

