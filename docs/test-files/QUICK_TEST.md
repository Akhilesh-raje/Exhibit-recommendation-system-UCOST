# 🧪 Quick Test Guide - Enhanced Recommendation System

## Step 1: Start Backend Server

```bash
cd project/backend/backend
npm run dev
```

Wait for: `🚀 UCOST Discovery Hub Backend running on port 5000`

## Step 2: Run Test Script

In a new terminal:

```bash
node test_recommendations.mjs
```

This will run 5 test scenarios and show results.

## Step 3: Manual Test (Alternative)

Use **Postman** or browser DevTools:

**URL:** `POST http://localhost:5000/api/tours/recommend`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "userProfile": {
    "ageBand": "adults",
    "groupType": "individual",
    "interests": ["physics"],
    "timeBudget": 60,
    "groupSize": 1
  },
  "selectedFloor": "ground",
  "globalTimeBudget": false
}
```

## ✅ What to Verify

1. **Interest Matching:**
   - User selects "physics" → Only physics exhibits appear
   - User selects "robotics" → Environment exhibits are filtered out

2. **Age Filtering:**
   - Kids profile → Only kid-friendly exhibits
   - Adults profile → Adult-appropriate exhibits

3. **Group Type:**
   - Family group → Safe, accessible exhibits
   - Research group → Educational exhibits

4. **Response Quality:**
   - Each recommendation has clear `reasons`
   - Scores are positive (> 0)
   - No irrelevant exhibits appear

## 🐛 Troubleshooting

**No recommendations returned?**
- Check if exhibits exist in database
- Verify exhibit descriptions contain interest keywords
- Try broader interests

**Wrong exhibits shown?**
- Check exhibit `description` field has proper keywords
- Verify interest spelling matches exhibit content
- Check console logs for filtering decisions

**Server not responding?**
- Ensure backend is running on port 5000
- Check for error messages in backend console
- Verify database connection

---

**Ready to test!** 🚀

