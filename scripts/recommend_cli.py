#!/usr/bin/env python3
"""
Fetch exhibits from backend, call the ranker service, and print top recommendations.

Usage (PowerShell):
  $env:BACKEND_URL="http://localhost:5000/api"; $env:RANKER_URL="http://127.0.0.1:8012"; \
  python scripts/recommend_cli.py --interests physics,science --ageBand teens --groupType student --timeBudget 60
"""

import argparse
import os
import requests
from typing import Any, Dict, List


def fetch_exhibits(backend_url: str) -> List[Dict[str, Any]]:
    url = f"{backend_url.rstrip('/')}/exhibits"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else (data.get("exhibits") or data.get("data") or [])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--interests", type=str, default="")
    parser.add_argument("--ageBand", type=str, default="")
    parser.add_argument("--groupType", type=str, default="")
    parser.add_argument("--groupSize", type=int, default=1)
    parser.add_argument("--timeBudget", type=int, default=60)
    parser.add_argument("--mobility", type=str, default="none")
    parser.add_argument("--crowdTolerance", type=str, default="medium")
    parser.add_argument("--topK", type=int, default=10)
    args = parser.parse_args()

    backend_url = os.getenv("BACKEND_URL", "http://localhost:5000/api")
    ranker_url = os.getenv("RANKER_URL", "http://127.0.0.1:8012")

    exhibits = fetch_exhibits(backend_url)
    payload = {
        "userProfile": {
            "interests": [x.strip() for x in args.interests.split(",") if x.strip()],
            "ageBand": args.ageBand,
            "groupType": args.groupType,
            "groupSize": args.groupSize,
            "timeBudget": args.timeBudget,
            "mobility": args.mobility,
            "crowdTolerance": args.crowdTolerance,
        },
        "exhibits": [
            {"id": ex.get("id"), "name": ex.get("name"), "description": ex.get("description"), "category": ex.get("category"), "exhibitType": ex.get("exhibitType"), "ageRange": ex.get("ageRange"), "features": ex.get("features"), "interactiveFeatures": ex.get("interactiveFeatures")}
            for ex in exhibits
            if ex.get("id")
        ],
        "topK": args.topK,
    }

    r = requests.post(f"{ranker_url.rstrip('/')}/rank", json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        print("❌ Ranking failed")
        return 1
    results = data.get("results", [])
    print("Top Recommendations:")
    for i, item in enumerate(results, 1):
        print(f"{i:2d}. {item['id']}  score={item['score']:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


