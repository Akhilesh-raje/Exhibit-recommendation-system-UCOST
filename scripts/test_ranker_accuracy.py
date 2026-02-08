#!/usr/bin/env python3
"""
Evaluate the ML ranker directly using backend exhibits.

Reads exhibits from BACKEND_URL, calls RANKER_URL /rank, and computes
precision/recall/F1/MRR/coverage/interest-match metrics similar to the
existing accuracy script.

Outputs: accuracy_ranker_report.json at repo root.
"""

import os
import json
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple
import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000/api')
RANKER_URL = os.getenv('RANKER_URL', 'http://127.0.0.1:8012')


def fetch_all_exhibits() -> List[Dict[str, Any]]:
    # Try local files first
    local_files = [
        Path(ROOT) / "gemma" / "dataset" / "training_data.jsonl",
        Path(ROOT) / "data" / "exhibits.template.json",
    ]
    
    for file_path in local_files:
        if file_path.exists():
            print(f"Loading exhibits from: {file_path}")
            if file_path.suffix == ".jsonl":
                # Read JSONL format
                exhibits = []
                with open(file_path, "r", encoding="utf-8") as f:
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
                                "interactiveFeatures": ctx.get("features", []),
                                "features": ctx.get("features", []),
                                "averageTime": ctx.get("duration", 0),
                                "rating": ctx.get("rating", 0),
                            }
                            exhibits.append(ex)
                if exhibits:
                    return exhibits
            elif file_path.suffix == ".json":
                # Read JSON format
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
                    return data.get("exhibits") or data.get("data") or []
    
    # Fallback to API
    try:
        print(f"Fetching exhibits from API: {BACKEND_URL}")
        url = f"{BACKEND_URL.rstrip('/')}/exhibits"
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else (data.get('exhibits') or data.get('data') or [])
    except Exception as e:
        print(f"Warning: API fetch failed: {e}")
        print("Error: No exhibits found. Please ensure backend is running or provide local data files.")
        return []


def find_exhibits_by_keywords(exhibits: List[Dict[str, Any]], keywords: List[str], min_matches: int = 1) -> Set[str]:
    matches = set()
    kw = [k.lower() for k in keywords]
    for ex in exhibits:
        text = ' '.join([
            ex.get('name', ''),
            ex.get('description', ''),
            ex.get('category', ''),
            ex.get('exhibitType', ''),
            ' '.join(ex.get('features', []) or ex.get('interactiveFeatures', []) or [])
        ]).lower()
        cnt = sum(1 for k in kw if k in text)
        if cnt >= min_matches:
            if ex.get('id'):
                matches.add(ex.get('id'))
    return matches


def create_test_cases(exhibits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    tests: List[Dict[str, Any]] = []
    if not exhibits:
        return tests

    # AI and Robotics
    ai_kw = ['ai', 'artificial intelligence', 'robotics', 'machine learning', 'technology']
    ai_ex = find_exhibits_by_keywords(exhibits, ai_kw)
    if ai_ex:
        tests.append({
            'name': 'AI and Robotics Interest Match',
            'userProfile': {
                'interests': ['ai', 'robotics', 'technology'],
                'ageBand': 'researchers',
                'groupType': 'student',
                'groupSize': 2,
                'timeBudget': 90,
                'mobility': 'none',
                'crowdTolerance': 'medium'
            },
            'expected': list(ai_ex)[:5],
            'keywords': ai_kw
        })

    # Physics
    physics_kw = ['physics', 'force', 'motion', 'energy', 'gravity', 'electricity', 'wave']
    physics_ex = find_exhibits_by_keywords(exhibits, physics_kw)
    if physics_ex:
        tests.append({
            'name': 'Physics Interest Match',
            'userProfile': {
                'interests': ['physics', 'science', 'motion'],
                'ageBand': 'students',
                'groupType': 'student',
                'groupSize': 2,
                'timeBudget': 60,
                'mobility': 'none',
                'crowdTolerance': 'medium'
            },
            'expected': list(physics_ex)[:5],
            'keywords': physics_kw
        })

    # Astronomy and Space
    space_kw = ['astronomy', 'stars', 'planets', 'space', 'celestial', 'planetarium', 'taramandal']
    space_ex = find_exhibits_by_keywords(exhibits, space_kw)
    if space_ex:
        tests.append({
            'name': 'Astronomy and Space Interest Match',
            'userProfile': {
                'interests': ['astronomy', 'stars', 'space'],
                'ageBand': 'researchers',
                'groupType': 'adult',
                'groupSize': 1,
                'timeBudget': 45,
                'mobility': 'none',
                'crowdTolerance': 'low'
            },
            'expected': list(space_ex)[:5],
            'keywords': space_kw
        })

    # Technology and Innovation
    tech_kw = ['technology', 'innovation', 'stem', 'engineering', 'creative']
    tech_ex = find_exhibits_by_keywords(exhibits, tech_kw)
    if tech_ex:
        tests.append({
            'name': 'Technology and Innovation Interest Match',
            'userProfile': {
                'interests': ['technology', 'innovation', 'stem'],
                'ageBand': 'researchers',
                'groupType': 'student',
                'groupSize': 3,
                'timeBudget': 120,
                'mobility': 'none',
                'crowdTolerance': 'high'
            },
            'expected': list(tech_ex)[:5],
            'keywords': tech_kw
        })

    # Family-friendly and Interactive
    family_kw = ['family', 'children', 'kid', 'interactive', 'hands-on', 'experiment']
    family_ex = find_exhibits_by_keywords(exhibits, family_kw)
    if family_ex:
        tests.append({
            'name': 'Family-Friendly Exhibits',
            'userProfile': {
                'interests': ['interactive', 'hands-on', 'family'],
                'ageBand': 'kids',
                'groupType': 'family',
                'groupSize': 4,
                'timeBudget': 90,
                'mobility': 'none',
                'crowdTolerance': 'medium'
            },
            'expected': list(family_ex)[:5],
            'keywords': family_kw
        })

    categories = { (ex.get('category') or '').lower() for ex in exhibits if ex.get('category') }
    if categories:
        test_cat = list(categories)[0]
        cat_ex = find_exhibits_by_keywords(exhibits, [test_cat])
        if cat_ex:
            tests.append({
                'name': f'{test_cat.title()} Category Match',
                'userProfile': {
                    'interests': [test_cat],
                    'ageBand': 'adults',
                    'groupType': 'adult',
                    'groupSize': 1,
                    'timeBudget': 45,
                    'mobility': 'none',
                    'crowdTolerance': 'low'
                },
                'expected': list(cat_ex)[:5],
                'keywords': [test_cat]
            })

    # General recommendations: expect top-rated or popular exhibits
    if exhibits:
        # Find exhibits with ratings or popular categories
        rated_exhibits = [ex.get('id') for ex in exhibits if ex.get('rating', 0) and float(ex.get('rating', 0) or 0) > 3.5]
        if not rated_exhibits:
            # Fallback: use exhibits with categories
            rated_exhibits = [ex.get('id') for ex in exhibits if ex.get('category')][:10]
        tests.append({
            'name': 'General Recommendations',
            'userProfile': {
                'interests': [],
                'ageBand': 'adults',
                'groupType': 'adult',
                'groupSize': 1,
                'timeBudget': 60,
                'mobility': 'none',
                'crowdTolerance': 'medium'
            },
            'expected': rated_exhibits[:5] if rated_exhibits else [],
            'keywords': ['popular', 'rated', 'general']
        })

    return tests


def call_ranker(user_profile: Dict[str, Any], exhibits: List[Dict[str, Any]], top_k: int = 50) -> List[Dict[str, Any]]:
    payload = {
        'userProfile': user_profile,
        'exhibits': [
            {
                'id': ex.get('id'),
                'name': ex.get('name'),
                'description': ex.get('description'),
                'category': ex.get('category'),
                'exhibitType': ex.get('exhibitType'),
                'ageRange': ex.get('ageRange'),
                'features': ex.get('features'),
                'interactiveFeatures': ex.get('interactiveFeatures'),
                'rating': ex.get('rating'),
                'tags': ex.get('tags')
            } for ex in exhibits if ex.get('id')
        ],
        'topK': top_k,
    }
    r = requests.post(f"{RANKER_URL.rstrip('/')}/rank", json=payload, timeout=60)
    if not r.ok:
        return []
    data = r.json()
    if not data.get('success'):
        return []
    # Return list of ids in order
    return data.get('results', [])


def calculate_metrics(recommended: List[str], expected: List[str], all_exhibits: Set[str]) -> Dict[str, Any]:
    recommended_set = set(recommended)
    expected_set = set(expected)

    tp = len(recommended_set & expected_set)
    fp = len(recommended_set - expected_set)
    fn = len(expected_set - recommended_set)
    tn = len(all_exhibits - recommended_set - expected_set) if expected_set else 0

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0

    mrr = 0.0
    if expected_set and recommended:
        for idx, ex_id in enumerate(recommended):
            if ex_id in expected_set:
                mrr = 1.0 / (idx + 1)
                break

    coverage = tp / len(expected_set) if expected_set else 0.0
    return {
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'accuracy': accuracy,
        'mrr': mrr,
        'coverage': coverage,
        'tp': tp,
        'fp': fp,
        'fn': fn,
        'tn': tn,
    }


def interest_match_score(recommended_ids: List[str], exhibits: List[Dict[str, Any]], keywords: List[str]) -> float:
    if not recommended_ids or not keywords:
        return 0.0
    kw = [k.lower() for k in keywords]
    ex_map = {ex.get('id'): ex for ex in exhibits}
    hits = 0
    for ex_id in recommended_ids:
        ex = ex_map.get(ex_id)
        if not ex:
            continue
        text = ' '.join([ex.get('name', ''), ex.get('description', ''), ex.get('category', '')]).lower()
        if any(k in text for k in kw):
            hits += 1
    return hits / len(recommended_ids)


def main() -> int:
    print("Starting Ranker Accuracy Tests...")
    exhibits = fetch_all_exhibits()
    if not exhibits:
        print("Error: No exhibits found. Cannot run accuracy tests.")
        return 1
    
    print(f"Loaded {len(exhibits)} exhibits")
    tests = create_test_cases(exhibits)
    print(f"Created {len(tests)} test cases")
    all_ids = {ex.get('id') for ex in exhibits if ex.get('id')}

    print(f"\nTesting ranker at {RANKER_URL}...")
    results = []
    for i, tc in enumerate(tests, 1):
        print(f"  Test {i}/{len(tests)}: {tc['name']}...", end=" ", flush=True)
        try:
            ranked = call_ranker(tc['userProfile'], exhibits, top_k=50)
            rec_ids = [r.get('id') for r in ranked]
            metrics = calculate_metrics(rec_ids, tc.get('expected', []), all_ids)
            metrics['interest_match'] = interest_match_score(rec_ids, exhibits, tc.get('keywords', []))
            results.append({
                'test_name': tc['name'],
                'metrics': metrics,
                'recommended_count': len(rec_ids)
            })
            print(f"OK - Precision: {metrics['precision']:.2f}, Interest Match: {metrics['interest_match']:.2f}")
        except Exception as e:
            print(f"Error: {e}")
            results.append({
                'test_name': tc['name'],
                'error': str(e),
                'metrics': {}
            })

    # Aggregate
    if results:
        n = len(results)
        avg = lambda k: sum(r['metrics'].get(k, 0.0) for r in results) / n
        metrics = {
            'total_tests': n,
            'average_precision': avg('precision'),
            'average_recall': avg('recall'),
            'average_f1_score': avg('f1_score'),
            'average_accuracy': avg('accuracy'),
            'average_mrr': avg('mrr'),
            'average_coverage': avg('coverage'),
            'average_interest_match': avg('interest_match'),
        }
    else:
        metrics = {'error': 'no tests'}

    report = {'metrics': metrics, 'test_results': results}
    out_path = os.path.join(ROOT, 'accuracy_ranker_report.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\nAccuracy Test Summary:")
    print(f"  Total Tests: {metrics.get('total_tests', 0)}")
    print(f"  Average Precision: {metrics.get('average_precision', 0):.3f}")
    print(f"  Average Recall: {metrics.get('average_recall', 0):.3f}")
    print(f"  Average F1 Score: {metrics.get('average_f1_score', 0):.3f}")
    print(f"  Average MRR: {metrics.get('average_mrr', 0):.3f}")
    print(f"  Average Interest Match: {metrics.get('average_interest_match', 0):.3f}")
    print(f"\nSaved ranker accuracy report to: {out_path}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())


