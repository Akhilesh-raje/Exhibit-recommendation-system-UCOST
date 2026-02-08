"""
Test script for user's specific interests: earth, environment, chemistry, space
"""

import requests
import json
from pathlib import Path

ROOT = Path(__file__).parent
RANKER_URL = "http://127.0.0.1:8012"

def load_exhibits():
    """Load exhibits from training data."""
    exhibits = []
    data_file = ROOT / "gemma" / "dataset" / "training_data.jsonl"
    if data_file.exists():
        with open(data_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    obj = json.loads(line)
                    ctx = obj.get("context", {})
                    ex = {
                        "id": obj.get("id", ""),
                        "name": ctx.get("name", ""),
                        "description": ctx.get("description", ""),
                        "category": ctx.get("category", ""),
                        "exhibitType": ctx.get("exhibitType", ""),
                        "ageRange": ctx.get("ageRange", ""),
                        "features": ctx.get("features", []),
                        "interactiveFeatures": ctx.get("features", []),
                        "tags": ctx.get("features", []),
                    }
                    exhibits.append(ex)
    return exhibits

def test_user_interests():
    """Test with user's specific interests."""
    exhibits = load_exhibits()
    
    # User's exact interests from the image
    user_profile = {
        "interests": ["earth", "environment", "chemistry", "space"],
        "ageBand": "students",
        "groupType": "student",
        "groupSize": 2,
        "timeBudget": 30,  # quick tour
        "mobility": "none",
        "crowdTolerance": "medium"
    }
    
    payload = {
        "userProfile": user_profile,
        "exhibits": exhibits,
        "topK": 15
    }
    
    print("Testing User's Specific Interests")
    print("=" * 60)
    print(f"Interests: {user_profile['interests']}")
    print(f"Expected: Top 10-15 exhibits MUST match these interests")
    print(f"Expected: FIRST exhibit should be Taramandal (space interest present)")
    print()
    
    try:
        r = requests.post(f"{RANKER_URL}/rank", json=payload, timeout=30)
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                results = data.get("results", [])
                print(f"Received {len(results)} recommendations\n")
                
                # Check interest matching
                interest_keywords = [
                    "earth", "environment", "environmental", "ecology", "ecological", 
                    "chemistry", "chemical", "molecule", "reaction",
                    "space", "astronomy", "stars", "planets", "celestial", "taramandal"
                ]
                
                matched_count = 0
                taramandal_first = False
                
                print("Top 15 Recommendations:")
                for i, result in enumerate(results[:15], 1):
                    ex_id = result.get("id", "")
                    score = result.get("score", 0)
                    
                    # Find exhibit details
                    ex = next((e for e in exhibits if e.get("id") == ex_id), None)
                    if ex:
                        name = ex.get("name", "")
                        desc = ex.get("description", "")
                        category = ex.get("category", "")
                        tags = ex.get("tags", []) or ex.get("features", [])
                        
                        # Check if matches interests
                        text = f"{name} {desc} {category} {' '.join(tags)}".lower()
                        matches = [kw for kw in interest_keywords if kw in text]
                        
                        match_status = "MATCH" if matches else "NO MATCH"
                        if matches:
                            matched_count += 1
                        
                        # Check if taramandal
                        is_taramandal = "taramandal" in name.lower()
                        if is_taramandal and i == 1:
                            taramandal_first = True
                        
                        print(f"{i}. {name[:60]}")
                        print(f"   Score: {score:.4f} | {match_status}")
                        if matches:
                            print(f"   Matches: {', '.join(matches[:3])}")
                        if is_taramandal:
                            print(f"   *** TARAMANDAL EXHIBIT ***")
                        print()
                
                print("=" * 60)
                print(f"Summary:")
                print(f"  Total recommendations: {len(results)}")
                print(f"  Interest-matched in top 15: {matched_count}/15 ({matched_count/15*100:.1f}%)")
                print(f"  Taramandal is first: {'YES' if taramandal_first else 'NO'}")
                print()
                
                if matched_count == 15:
                    print("SUCCESS: All top 15 recommendations match interests!")
                elif matched_count >= 12:
                    print(f"GOOD: {matched_count}/15 match (target: 15/15)")
                else:
                    print(f"NEEDS IMPROVEMENT: Only {matched_count}/15 match (target: 15/15)")
                
                if taramandal_first:
                    print("SUCCESS: Taramandal is first (space interest present)")
                else:
                    print("WARNING: Taramandal should be first when space interest is present")
            else:
                print(f"Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"HTTP Error: {r.status_code}")
            print(r.text[:500])
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_user_interests()

