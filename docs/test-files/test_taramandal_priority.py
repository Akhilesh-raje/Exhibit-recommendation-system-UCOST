"""
Test script to verify taramandal is always first when astronomy interests are present.
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

def test_taramandal_priority():
    """Test that taramandal is first when astronomy interests are present."""
    exhibits = load_exhibits()
    
    # Test cases with astronomy-related interests
    test_cases = [
        {
            "name": "Stars interest",
            "interests": ["stars"],
            "should_have_taramandal_first": True
        },
        {
            "name": "Astronomy interest",
            "interests": ["astronomy"],
            "should_have_taramandal_first": True
        },
        {
            "name": "Space interest",
            "interests": ["space"],
            "should_have_taramandal_first": True
        },
        {
            "name": "Planets interest",
            "interests": ["planets"],
            "should_have_taramandal_first": True
        },
        {
            "name": "Multiple astronomy interests",
            "interests": ["stars", "astronomy", "space", "planets"],
            "should_have_taramandal_first": True
        },
        {
            "name": "Mixed interests with astronomy",
            "interests": ["earth", "environment", "chemistry", "space"],
            "should_have_taramandal_first": True
        },
        {
            "name": "No astronomy interests",
            "interests": ["chemistry", "biology"],
            "should_have_taramandal_first": False
        }
    ]
    
    print("Testing Taramandal Priority Logic\n")
    print("=" * 60)
    
    for test_case in test_cases:
        user_profile = {
            "interests": test_case["interests"],
            "ageBand": "students",
            "groupType": "student",
            "groupSize": 2,
            "timeBudget": 90,
            "mobility": "none",
            "crowdTolerance": "medium"
        }
        
        payload = {
            "userProfile": user_profile,
            "exhibits": exhibits,
            "topK": 15
        }
        
        print(f"\nTest: {test_case['name']}")
        print(f"Interests: {test_case['interests']}")
        
        try:
            r = requests.post(f"{RANKER_URL}/rank", json=payload, timeout=30)
            if r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    results = data.get("results", [])
                    
                    # Check if taramandal is in results
                    taramandal_found = False
                    taramandal_position = None
                    first_exhibit_id = None
                    
                    for i, result in enumerate(results[:5], 1):  # Check top 5
                        ex_id = result.get("id", "")
                        # Find exhibit name
                        ex = next((e for e in exhibits if e.get("id") == ex_id), None)
                        if ex:
                            name = ex.get("name", "").lower()
                            if "taramandal" in name:
                                taramandal_found = True
                                taramandal_position = i
                                if i == 1:
                                    first_exhibit_id = ex_id
                                break
                            if i == 1:
                                first_exhibit_id = ex_id
                    
                    if test_case["should_have_taramandal_first"]:
                        if taramandal_found and taramandal_position == 1:
                            print(f"  PASS: Taramandal is FIRST (position 1)")
                        elif taramandal_found:
                            print(f"  FAIL: Taramandal found at position {taramandal_position}, should be 1")
                        else:
                            print(f"  FAIL: Taramandal not found in top 5 results")
                            if first_exhibit_id:
                                first_ex = next((e for e in exhibits if e.get("id") == first_exhibit_id), None)
                                if first_ex:
                                    print(f"  First exhibit: {first_ex.get('name', 'Unknown')}")
                    else:
                        if not taramandal_found:
                            print(f"  PASS: Taramandal not prioritized (correct for non-astronomy interests)")
                        else:
                            print(f"  INFO: Taramandal found at position {taramandal_position} (may be coincidental)")
                else:
                    print(f"  ERROR: {data.get('error', 'Unknown error')}")
            else:
                print(f"  HTTP Error: {r.status_code}")
        except Exception as e:
            print(f"  ERROR: {e}")
    
    print("\n" + "=" * 60)
    print("Test Complete")

if __name__ == "__main__":
    test_taramandal_priority()

