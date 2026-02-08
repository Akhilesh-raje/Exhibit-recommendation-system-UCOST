"""
Test script to verify strict interest matching.
Tests with environment, astronomy, and biology interests.
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

def test_strict_matching():
    """Test with environment, astronomy, biology interests."""
    exhibits = load_exhibits()
    
    # Test case: environment, astronomy, biology
    user_profile = {
        "interests": ["environment", "astronomy", "biology"],
        "ageBand": "students",
        "groupType": "student",
        "groupSize": 2,
        "timeBudget": 90,
        "mobility": "none",
        "crowdTolerance": "medium"
    }
    
    payload = {
        "userProfile": user_profile,
        "exhibits": exhibits[:50],  # Test with first 50 exhibits
        "topK": 10
    }
    
    print("Testing strict interest matching...")
    print(f"User interests: {user_profile['interests']}")
    print(f"Testing with {len(payload['exhibits'])} exhibits\n")
    
    try:
        r = requests.post(f"{RANKER_URL}/rank", json=payload, timeout=30)
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                results = data.get("results", [])
                print(f"Received {len(results)} recommendations\n")
                
                # Check which exhibits match interests
                interest_keywords = ["environment", "astronomy", "biology", "biological", "ecological", "space", "star", "planet", "universe", "celestial"]
                
                matched_count = 0
                print("Top Recommendations:")
                for i, result in enumerate(results[:10], 1):
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
                        matched_count += 1 if matches else 0
                        
                        print(f"{i}. {name[:50]}")
                        print(f"   Score: {score:.4f} | {match_status}")
                        if matches:
                            print(f"   Matches: {', '.join(matches)}")
                        print()
                
                print(f"\nSummary:")
                print(f"  Total recommendations: {len(results)}")
                print(f"  Interest-matched: {matched_count}/{len(results)} ({matched_count/len(results)*100:.1f}%)")
                print(f"  Expected: 100% match for top recommendations")
                
                if matched_count == len(results):
                    print("\nSUCCESS: All recommendations match interests!")
                elif matched_count >= len(results) * 0.8:
                    print(f"\nPARTIAL: {matched_count/len(results)*100:.1f}% match (target: 100%)")
                else:
                    print(f"\nFAILED: Only {matched_count/len(results)*100:.1f}% match (target: 100%)")
            else:
                print(f"Error: {data.get('error', 'Unknown error')}")
        else:
            print(f"HTTP Error: {r.status_code}")
            print(r.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_strict_matching()

