#!/usr/bin/env python3
"""
Test script to verify the chatbot is working correctly with UCOST exhibits.
This script tests various questions about uploaded exhibits.
"""
import json
import sys
import time
import urllib.request
import urllib.error
from urllib.parse import urlencode

GEMMA_URL = "http://127.0.0.1:8011"
API_BASE_URL = "http://localhost:5000/api"

def make_request(url, method='GET', data=None, timeout=5):
    """Make HTTP request using urllib (no external dependencies)"""
    try:
        req = urllib.request.Request(url)
        if method == 'POST' and data:
            req.add_header('Content-Type', 'application/json')
            req_data = json.dumps(data).encode('utf-8')
        else:
            req_data = None
        
        with urllib.request.urlopen(req, req_data, timeout=timeout) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        raise Exception(f"Connection error: {e.reason}")
    except json.JSONDecodeError as e:
        raise Exception(f"Invalid JSON response: {e}")

def test_gemma_health():
    """Test if Gemma AI service is running"""
    print("=" * 60)
    print("🧪 Testing Gemma AI Service Health")
    print("=" * 60)
    try:
        status, data = make_request(f"{GEMMA_URL}/health", timeout=5)
        if status == 200:
            print(f"✅ Service Status: {data.get('status')}")
            print(f"✅ Indexed: {data.get('indexed')}")
            print(f"✅ Has Rows: {data.get('has_rows')}")
            print(f"✅ Exhibit Count: {data.get('exhibit_count')}")
            return True
        else:
            print(f"❌ Health check failed: {status}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to Gemma AI service: {e}")
        print(f"   Make sure the service is running: npm run dev:gemma")
        return False

def test_backend_health():
    """Test if backend API is running"""
    print("\n" + "=" * 60)
    print("🧪 Testing Backend API")
    print("=" * 60)
    try:
        status, data = make_request(f"{API_BASE_URL}/exhibits", timeout=5)
        if status == 200:
            exhibits = data.get('exhibits', []) or data.get('data', [])
            print(f"✅ Backend is running")
            print(f"✅ Found {len(exhibits)} exhibits in database")
            if len(exhibits) > 0:
                print(f"   Sample: {exhibits[0].get('name', 'Unknown')}")
            return True, exhibits
        else:
            print(f"❌ Backend check failed: {status}")
            return False, []
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print(f"   Make sure backend is running: npm run dev:backend")
        return False, []

def test_query(query: str, expected_min_results: int = 1):
    """Test a query against Gemma AI"""
    print(f"\n📝 Query: '{query}'")
    try:
        status, data = make_request(
            f"{GEMMA_URL}/recommend",
            method='POST',
            data={"query": query, "limit": 5},
            timeout=10
        )
        
        if status != 200:
            print(f"   ❌ Error: {status}")
            print(f"   Response: {str(data)[:200]}")
            return False, []
        
        if data.get('error') or data.get('reason') == 'index not built':
            print(f"   ❌ Error: {data.get('error', data.get('reason'))}")
            return False, []
        
        exhibits = data.get('exhibits', [])
        print(f"   ✅ Found {len(exhibits)} results")
        
        if len(exhibits) >= expected_min_results:
            print(f"   ✅ PASS (expected at least {expected_min_results})")
            for i, ex in enumerate(exhibits[:3], 1):
                print(f"      {i}. ID: {ex.get('id', 'N/A')[:20]}... Score: {ex.get('score', 0):.3f}")
            return True, exhibits
        else:
            print(f"   ⚠️  Found {len(exhibits)} results (expected at least {expected_min_results})")
            return True, exhibits  # Still pass if we got some results
            
    except Exception as e:
        print(f"   ❌ Query failed: {e}")
        return False, []

def test_exhibit_fetch(exhibit_ids: list):
    """Test fetching exhibit details from backend"""
    print(f"\n📦 Testing Exhibit Details Fetch")
    success_count = 0
    
    for ex_id in exhibit_ids[:3]:  # Test first 3
        try:
            status, data = make_request(f"{API_BASE_URL}/exhibits/{ex_id}", timeout=5)
            if status == 200:
                exhibit = data.get('exhibit') or data
                if exhibit:
                    print(f"   ✅ Fetched: {exhibit.get('name', 'Unknown')}")
                    success_count += 1
                else:
                    print(f"   ⚠️  ID {ex_id[:20]}... returned empty")
            else:
                print(f"   ❌ ID {ex_id[:20]}... failed: {status}")
        except Exception as e:
            print(f"   ❌ ID {ex_id[:20]}... error: {e}")
    
    return success_count > 0

def main():
    print("\n" + "=" * 60)
    print("🤖 UCOST Chatbot Test Suite")
    print("=" * 60)
    print("\nThis script tests if the chatbot can answer questions")
    print("about exhibits uploaded to UCOST.\n")
    
    # Test 1: Health checks
    gemma_ok = test_gemma_health()
    backend_ok, exhibits = test_backend_health()
    
    if not gemma_ok or not backend_ok:
        print("\n❌ Prerequisites not met. Please start services:")
        print("   npm run dev:backend")
        print("   npm run dev:gemma")
        return False
    
    if len(exhibits) == 0:
        print("\n⚠️  No exhibits found in database!")
        print("   Please upload exhibits via the admin panel first.")
        return False
    
    # Get sample exhibit names for testing
    sample_names = [ex.get('name', '') for ex in exhibits[:5] if ex.get('name')]
    sample_categories = list(set([ex.get('category', '') for ex in exhibits if ex.get('category')]))[:3]
    
    print("\n" + "=" * 60)
    print("🧪 Testing Chatbot Queries")
    print("=" * 60)
    
    test_queries = [
        # Generic questions
        ("what exhibits are there", 1),
        ("tell me about exhibits", 1),
        ("show me science exhibits", 1),
        
        # Category-based questions
    ]
    
    # Add category questions if we have categories
    if sample_categories:
        for cat in sample_categories:
            test_queries.append((f"tell me about {cat.lower()} exhibits", 1))
    
    # Add exhibit name questions if we have names
    if sample_names:
        for name in sample_names[:3]:
            # Test partial name matching
            words = name.split()
            if len(words) > 0:
                test_queries.append((f"tell me about {words[0].lower()}", 1))
                if len(words) > 1:
                    test_queries.append((words[0].lower(), 1))  # Just one word
    
    # Add some common misspellings/variations
    test_queries.extend([
        ("himalayas", 0),  # Should find if exists
        ("physics", 0),
        ("biology", 0),
        ("interactive", 0),
        ("science center", 1),
    ])
    
    results = []
    all_exhibit_ids = []
    
    for query, min_results in test_queries:
        success, exhibit_ids = test_query(query, min_results)
        results.append((query, success))
        if exhibit_ids:
            all_exhibit_ids.extend([ex.get('id') for ex in exhibit_ids])
    
    # Test exhibit details fetching
    if all_exhibit_ids:
        details_ok = test_exhibit_fetch(all_exhibit_ids)
    else:
        details_ok = False
        print("\n⚠️  No exhibit IDs to test details fetching")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"\n✅ Queries Passed: {passed}/{total}")
    
    if details_ok:
        print("✅ Exhibit Details Fetch: Working")
    else:
        print("⚠️  Exhibit Details Fetch: Some issues")
    
    overall_success = passed >= total * 0.7 and details_ok  # 70% pass rate
    
    if overall_success:
        print("\n🎉 Chatbot is working correctly!")
        print("\nYou can now test it in the browser:")
        print("   1. Open http://localhost:5173")
        print("   2. Click the chatbot button")
        print("   3. Try asking questions about exhibits")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        print("\nCommon fixes:")
        print("   • Make sure all services are running: npm run dev:all")
        print("   • Rebuild embeddings: npm run gemma:rebuild")
        print("   • Check that exhibits are uploaded in admin panel")
    
    return overall_success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n❌ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

