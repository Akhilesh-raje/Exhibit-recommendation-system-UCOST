# Testing the Enhanced Recommendation System

## Quick Test Guide

### Prerequisites
1. Start the backend server:
```bash
cd project/backend/backend
npm run dev
```

2. Ensure you have some exhibits in the database (or use existing data)

### Test Using Browser/Postman

#### Test 1: Physics Interest Only (Strict Filtering)
**Endpoint:** `POST http://localhost:5000/api/tours/recommend`

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

**Expected:** Only exhibits that mention physics, mechanics, energy, optics, etc. should appear.

---

#### Test 2: Robotics Interest (Should NOT show environment)
**Body:**
```json
{
  "userProfile": {
    "ageBand": "teens",
    "groupType": "student",
    "interests": ["robotics", "ai", "technology"],
    "timeBudget": 90,
    "groupSize": 5
  },
  "selectedFloor": "all",
  "globalTimeBudget": false
}
```

**Expected:** Only tech/robotics exhibits. Environment exhibits should be filtered out unless they mention technology.

---

#### Test 3: Kids Age Filtering
**Body:**
```json
{
  "userProfile": {
    "ageBand": "kids",
    "groupType": "family",
    "interests": ["science", "nature"],
    "timeBudget": 45,
    "groupSize": 4
  },
  "selectedFloor": "ground",
  "globalTimeBudget": false
}
```

**Expected:** Only age-appropriate exhibits for children. Adult-only exhibits should be filtered out.

---

#### Test 4: Environment Interest (Should NOT show physics/robotics)
**Body:**
```json
{
  "userProfile": {
    "ageBand": "adults",
    "groupType": "individual",
    "interests": ["environment", "nature", "conservation"],
    "timeBudget": 60,
    "groupSize": 1
  },
  "selectedFloor": "all",
  "globalTimeBudget": false
}
```

**Expected:** Only environment/nature exhibits. Physics and robotics exhibits should be filtered out.

---

### Test Using cURL

```bash
# Test 1: Physics only
curl -X POST http://localhost:5000/api/tours/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "ageBand": "adults",
      "groupType": "individual",
      "interests": ["physics"],
      "timeBudget": 60,
      "groupSize": 1
    },
    "selectedFloor": "ground",
    "globalTimeBudget": false
  }'

# Test 2: Robotics (should exclude environment)
curl -X POST http://localhost:5000/api/tours/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "ageBand": "teens",
      "groupType": "student",
      "interests": ["robotics", "ai"],
      "timeBudget": 90,
      "groupSize": 5
    },
    "selectedFloor": "all",
    "globalTimeBudget": false
  }'
```

---

### What to Verify

✅ **Strict Interest Matching:**
- User selects "physics" → Only physics-related exhibits appear
- User selects "robotics" → Environment exhibits are filtered out
- User selects "environment" → Physics/robotics exhibits are filtered out

✅ **Age Filtering:**
- Kids profile → Only kid-friendly exhibits
- Adults profile → Adult-appropriate exhibits
- Age-inappropriate exhibits are filtered out

✅ **Group Type Filtering:**
- Family group → Safe, accessible exhibits
- Research group → Educational exhibits prioritized
- Incompatible exhibits are filtered out

✅ **Comprehensive Analysis:**
- System reads exhibit name, description, category, type, interactive features
- System uses semantic keyword matching
- System provides match reasons for each recommendation

---

### Expected Response Format

```json
{
  "success": true,
  "floor": "ground",
  "totalTime": 45,
  "timeBudget": 60,
  "globalRecommendation": false,
  "exhibits": [
    {
      "id": "exhibit-id",
      "name": "Exhibit Name",
      "description": "...",
      "category": "...",
      "averageTime": 15,
      "rating": 4.5,
      "reasons": [
        "Passes all filters",
        "Strong match for: physics",
        "Perfect for adults",
        "Semantic sim: 0.85"
      ],
      "score": 92.5
    }
  ]
}
```

---

### Debugging

If recommendations don't match expectations:

1. **Check exhibit data:** Ensure exhibits have proper descriptions, categories, and tags
2. **Check console logs:** Backend will log filtering decisions
3. **Verify interests:** Interests must match keywords in exhibit text
4. **Check age ranges:** Exhibits must have appropriate ageRange values

---

### Success Criteria

✅ System filters out exhibits that don't match interests
✅ System respects age appropriateness
✅ System respects group type compatibility
✅ System provides clear match reasons
✅ System prioritizes best matches based on all criteria

