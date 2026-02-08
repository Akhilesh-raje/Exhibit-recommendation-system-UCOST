# 🧪 Testing Guide: Enhanced Recommendation System

## ✅ What Was Changed

The recommendation system now uses **strict filtering** to ensure:
1. **Interest Matching**: Only exhibits that match user interests are shown
2. **Age Filtering**: Only age-appropriate exhibits appear
3. **Group Type Filtering**: Only group-compatible exhibits are recommended

---

## 🚀 Quick Test Steps

### Step 1: Start Backend Server

```bash
cd project/backend/backend
npm run dev
```

Server should start on `http://localhost:5000`

### Step 2: Test Using Postman/Browser

**Endpoint:** `POST http://localhost:5000/api/tours/recommend`

---

## 📋 Test Cases

### **Test 1: Physics Interest Only (STRICT FILTERING)**

**Request Body:**
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

**✅ Expected Result:**
- Only exhibits mentioning: physics, mechanics, energy, optics, quantum, force, motion, wave, light, sound
- **NO** environment exhibits (unless they mention physics)
- **NO** robotics exhibits (unless they mention physics)
- Each recommendation should have `reasons` showing "Strong match for: physics"

**❌ Should NOT See:**
- Pure environment exhibits (unless they mention physics)
- Pure biology exhibits (unless they mention physics)
- Random unrelated exhibits

---

### **Test 2: Robotics Interest (Should Exclude Environment)**

**Request Body:**
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

**✅ Expected Result:**
- Only exhibits mentioning: robotics, automation, ai, machine learning, technology, electronics, coding, programming
- **NO** environment exhibits
- **NO** geology/paleontology exhibits (unless tech-related)
- Reasons should include "Strong match for: robotics, ai, technology"

**❌ Should NOT See:**
- Pure environment exhibits
- Pure geology/dinosaur exhibits
- Pure nature exhibits (unless tech-related)

---

### **Test 3: Age Filtering - Kids Only**

**Request Body:**
```json
{
  "userProfile": {
    "ageBand": "kids",
    "groupType": "family",
    "interests": ["science"],
    "timeBudget": 45,
    "groupSize": 4
  },
  "selectedFloor": "ground",
  "globalTimeBudget": false
}
```

**✅ Expected Result:**
- Only kid-appropriate exhibits
- Exhibits with `ageRange` containing "children", "kids", "family", or "all"
- Reasons should include "Perfect for kids"

**❌ Should NOT See:**
- Adult-only exhibits
- Complex exhibits marked for adults
- Exhibits marked as not suitable for children

---

### **Test 4: Environment Interest (Should Exclude Physics/Robotics)**

**Request Body:**
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

**✅ Expected Result:**
- Only exhibits mentioning: environment, nature, climate, ecosystem, conservation, sustainability, wildlife, forest, ocean
- **NO** physics exhibits (unless they mention environment)
- **NO** robotics exhibits (unless they mention environment)

**❌ Should NOT See:**
- Pure physics exhibits
- Pure robotics/technology exhibits
- Pure geology exhibits (unless environment-related)

---

### **Test 5: Mixed Interests (Physics AND Biology)**

**Request Body:**
```json
{
  "userProfile": {
    "ageBand": "adults",
    "groupType": "research",
    "interests": ["physics", "biology"],
    "timeBudget": 120,
    "groupSize": 3
  },
  "selectedFloor": "all",
  "globalTimeBudget": false
}
```

**✅ Expected Result:**
- Exhibits that mention either physics OR biology
- Exhibits that mention both (higher score)
- Reasons should show which interests matched
- Should NOT see unrelated exhibits (e.g., pure geology, pure environment unless they mention physics/biology)

---

### **Test 6: Group Type Filtering - Family**

**Request Body:**
```json
{
  "userProfile": {
    "ageBand": "kids",
    "groupType": "family",
    "interests": ["science"],
    "timeBudget": 60,
    "groupSize": 4,
    "accessibility": "wheelchair"
  },
  "selectedFloor": "ground",
  "globalTimeBudget": false
}
```

**✅ Expected Result:**
- Family-friendly exhibits only
- Safe, accessible exhibits
- No dangerous/hazardous exhibits
- Reasons should include "Family-friendly interactive exhibit"

**❌ Should NOT See:**
- Exhibits marked as dangerous
- Exhibits marked as hazardous
- Exhibits not suitable for families

---

## 🔍 How to Verify Results

### Check Response Structure:

```json
{
  "success": true,
  "floor": "ground",
  "totalTime": 45,
  "timeBudget": 60,
  "exhibits": [
    {
      "id": "...",
      "name": "Exhibit Name",
      "description": "...",
      "category": "...",
      "reasons": [
        "Passes all filters",          // ✅ Must be present
        "Strong match for: physics",    // ✅ Should show matched interests
        "Perfect for adults",           // ✅ Should show age match
        "Semantic sim: 0.85"            // ✅ Semantic similarity score
      ],
      "score": 92.5                     // ✅ Should be positive (> 0)
    }
  ]
}
```

### Key Things to Check:

1. **Reasons Array:**
   - Should include "Passes all filters" for valid recommendations
   - Should show which interests matched
   - Should show age appropriateness

2. **Score:**
   - Should be positive (negative scores mean filtered out)
   - Higher scores = better matches

3. **Filtering:**
   - If user likes "physics", check that returned exhibits actually mention physics-related terms
   - If user is "kids", check that exhibits are age-appropriate
   - If user is "family", check that exhibits are safe

---

## 🐛 Troubleshooting

### Problem: Getting too many unrelated exhibits

**Solution:**
- Check if exhibits have proper `description` and `category` fields
- Verify interests are spelled correctly
- Check console logs for filtering decisions

### Problem: No recommendations returned

**Possible Causes:**
1. No exhibits match the strict filters
2. All exhibits were filtered out (age/interest/group mismatch)
3. Database has no exhibits

**Solution:**
- Check backend console for filtering logs
- Verify exhibits exist in database
- Try broader interests or different age group

### Problem: Recommendations don't match interests

**Solution:**
- Verify exhibit descriptions contain interest keywords
- Check if interest domain mapping is correct
- Review exhibit category and tags

---

## 📊 Expected Behavior Summary

| User Interest | Should See | Should NOT See |
|---------------|------------|----------------|
| **Physics** | Mechanics, Energy, Optics, Quantum | Environment, Pure Biology |
| **Robotics** | AI, Automation, Technology, ML | Environment, Geology, Nature |
| **Environment** | Nature, Climate, Conservation | Physics, Robotics, Pure Tech |
| **Biology** | Life, Cells, Evolution, Genetics | Pure Physics, Pure Tech |
| **Geology** | Rocks, Fossils, Dinosaurs | Robotics, Tech (unless geo-tech) |

| Age Group | Should See | Should NOT See |
|-----------|------------|----------------|
| **Kids** | Kid-friendly, Safe, Interactive | Adult-only, Complex, Dangerous |
| **Teens** | Educational, Engaging | Too simple, Too complex |
| **Adults** | Educational, In-depth | Child-only (unless all ages) |
| **Seniors** | Accessible, Comfortable | Physical challenges |

---

## ✅ Success Criteria

After testing, you should verify:

✅ **Strict Interest Matching**: User selects "physics" → Only physics exhibits appear
✅ **Age Filtering**: Kids profile → Only kid-appropriate exhibits  
✅ **Group Filtering**: Family group → Only safe, family-friendly exhibits
✅ **No Irrelevant Results**: Environment exhibits don't appear for physics interests
✅ **Clear Reasons**: Each recommendation shows why it was selected
✅ **Proper Scoring**: Higher scores for better matches

---

## 🎯 Quick Verification Checklist

- [ ] Physics interest returns only physics exhibits
- [ ] Robotics interest excludes environment exhibits
- [ ] Kids age group shows only kid-friendly exhibits
- [ ] Family group type shows only safe exhibits
- [ ] Each recommendation has clear reasons
- [ ] Scores are positive for recommended exhibits
- [ ] Irrelevant exhibits are filtered out

---

**Ready to test!** Start the backend and try the test cases above. 🚀

