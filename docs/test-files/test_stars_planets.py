"""
Test script specifically for stars and planets interests - verify Taramandal is first.
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

def test_stars_planets():
    """Test with stars and planets interests."""
    exhibits = load_exhibits()
    
    # Test case: stars and planets
    user_profile = {
        "interests": ["stars", "planets"],
        "ageBand": "students",
        "groupType": "student",
        "groupSize": 2,
        "timeBudget": 60,
        "mobility": "none",
        "crowdTolerance": "medium"
    }
    
    payload = {
        "userProfile": user_profile,
        "exhibits": exhibits,
        "topK": 15
    }
    
    print("Testing: Stars and Planets Interests")
    print("=" * 60)
    print(f"Interests: {user_profile['interests']}")
    print(f"Expected: FIRST exhibit MUST be Taramandal")
    print()
    
    try:
        r = requests.post(f"{RANKER_URL}/rank", json=payload, timeout=30)
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                results = data.get("results", [])
                print(f"Received {len(results)} recommendations\n")
                
                # Check first exhibit
                if results:
                    first_id = results[0].get("id", "")
                    first_score = results[0].get("score", 0)
                    
                    first_ex = next((e for e in exhibits if e.get("id") == first_id), None)
                    if first_ex:
                        first_name = first_ex.get("name", "")
                        is_taramandal = "taramandal" in first_name.lower()
                        
                        print(f"FIRST EXHIBIT:")
                        print(f"  ID: {first_id}")
                        print(f"  Name: {first_name}")
                        print(f"  Score: {first_score:.2f}")
                        print(f"  Is Taramandal: {is_taramandal}")
                        print()
                        
                        if is_taramandal:
                            print("SUCCESS: Taramandal is FIRST!")
                        else:
                            print("FAILED: Taramandal is NOT first!")
                            print(f"  First exhibit is: {first_name}")
                            
                            # Find where taramandal is
                            for i, result in enumerate(results[:10], 1):
                                ex_id = result.get("id", "")
                                ex = next((e for e in exhibits if e.get("id") == ex_id), None)
                                if ex and "taramandal" in ex.get("name", "").lower():
                                    print(f"  Taramandal found at position {i}")
                                    break
                    else:
                        print(f"ERROR: Could not find exhibit with ID: {first_id}")
                else:
                    print("ERROR: No results returned")
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
    test_stars_planets()

