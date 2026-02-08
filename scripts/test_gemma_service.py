#!/usr/bin/env python3
"""Quick test of Gemma recommender service."""

import requests
import json

RANKER_URL = "http://127.0.0.1:8011"

def test_health():
    r = requests.get(f"{RANKER_URL}/health")
    print("Health Check:", json.dumps(r.json(), indent=2))

def test_recommend(query: str, limit: int = 5):
    payload = {"query": query, "limit": limit}
    r = requests.post(f"{RANKER_URL}/recommend", json=payload)
    data = r.json()
    print(f"\nQuery: '{query}'")
    print(f"Results: {len(data.get('exhibits', []))} exhibits")
    for i, ex in enumerate(data.get('exhibits', [])[:5], 1):
        print(f"  {i}. ID: {ex.get('id')}, Score: {ex.get('score', 0):.4f}")
    return data

if __name__ == "__main__":
    test_health()
    test_recommend("artificial intelligence and machine learning", 5)
    test_recommend("physics and motion", 5)
    test_recommend("astronomy and stars", 5)

