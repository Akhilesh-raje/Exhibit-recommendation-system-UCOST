#!/usr/bin/env python3
"""
Test script to verify Gemma AI server is working correctly
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8011"

def test_health():
    """Test the health endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.ok:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return data.get('indexed', False)
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
        print(f"   Start with: cd gemma/infer && python server.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_recommend(query="physics exhibits"):
    """Test the recommend endpoint"""
    print(f"\nTesting /recommend endpoint with query: '{query}'...")
    try:
        response = requests.post(
            f"{BASE_URL}/recommend",
            json={"query": query, "limit": 5},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if response.ok:
            data = response.json()
            exhibits = data.get('exhibits', [])
            print(f"✅ Recommendation successful!")
            print(f"   Found {len(exhibits)} exhibits")
            if exhibits:
                print(f"   Top result: ID={exhibits[0].get('id')}, Score={exhibits[0].get('score', 0):.4f}")
            else:
                reason = data.get('reason', 'Unknown')
                error = data.get('error', '')
                print(f"   ⚠️  No exhibits found: {reason}")
                if error:
                    print(f"   Error: {error}")
            return True
        else:
            print(f"❌ Recommendation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Gemma AI Server Test")
    print("=" * 50)
    
    # Test health
    indexed = test_health()
    
    if indexed:
        # Test recommendations
        test_recommend("himalaya exhibits")
        test_recommend("physics")
        test_recommend("interactive displays")
    else:
        print("\n⚠️  Server is not indexed. Please build embeddings:")
        print("   cd gemma/scripts && python build_embeddings.py")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ All tests completed!")

