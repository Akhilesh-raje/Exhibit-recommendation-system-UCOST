#!/usr/bin/env python3
"""
Train a LambdaMART (LightGBM) ranker using exhibits and synthetic preference signals.

Inputs:
 - Backend API for exhibits (env BACKEND_URL, default http://localhost:5000/api)
 - Optional synthetic user profiles to generate training queries

Outputs:
 - ml/models/ranker.txt (LightGBM model)
 - ml/models/feature_keys.json
 - ml/artifacts/metrics.json
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import lightgbm as lgb
import requests

from features import build_feature_vector, FEATURE_KEYS

# Try to import advanced features, fallback if not available
try:
    import sys
    from pathlib import Path
    ml_dir = Path(__file__).parent
    if str(ml_dir) not in sys.path:
        sys.path.insert(0, str(ml_dir))
    from advanced_features import build_advanced_features, ADVANCED_FEATURE_KEYS
    HAS_ADVANCED = True
except (ImportError, AttributeError) as e:
    print(f"Note: Advanced features not available: {e}")
    HAS_ADVANCED = False
    ADVANCED_FEATURE_KEYS = FEATURE_KEYS


def fetch_exhibits(backend_url: str) -> List[Dict[str, Any]]:
    # Try local files first (prioritize training_data.jsonl with more exhibits)
    base = Path(__file__).resolve().parent.parent
    local_files = [
        base / "gemma" / "dataset" / "training_data.jsonl",  # First: most complete dataset
        base / "data" / "exhibits.template.json",  # Fallback
    ]
    
    for file_path in local_files:
        if file_path.exists():
            print(f"Loading exhibits from: {file_path}")
            if file_path.suffix == ".jsonl":
                # Read JSONL format (training_data.jsonl)
                exhibits = []
                with open(file_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            obj = json.loads(line)
                            # Convert from training_data format to exhibit format
                            ctx = obj.get("context", {})
                            ex = {
                                "id": obj.get("id", ""),
                                "name": ctx.get("name", ""),
                                "description": ctx.get("description", ""),
                                "category": ctx.get("category", ""),
                                "exhibitType": ctx.get("exhibitType", ""),
                                "ageRange": ctx.get("ageRange", ""),
                                "interactiveFeatures": ctx.get("features", []),
                                "averageTime": ctx.get("duration", 0),
                                "rating": ctx.get("rating", 0),
                            }
                            # Extract tags from category or features
                            tags = ctx.get("features", [])
                            if tags:
                                ex["tags"] = tags
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
        print(f"Fetching exhibits from API: {backend_url}")
        url = f"{backend_url.rstrip('/')}/exhibits"
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
        return data if isinstance(data, list) else (data.get("exhibits") or data.get("data") or [])
    except Exception as e:
        print(f"Warning: API fetch failed: {e}")
        print("Error: No exhibits found. Please ensure backend is running or provide local data files.")
        return []


def synthetic_user_profiles() -> List[Dict[str, Any]]:
    """Generate diverse user profiles matching exhibit categories and tags."""
    return [
        # AI and Robotics enthusiasts
        {"interests": ["ai", "robotics", "technology", "machine learning"], "ageBand": "researchers", "groupType": "student", "groupSize": 2, "timeBudget": 90, "mobility": "none", "crowdTolerance": "medium"},
        {"interests": ["artificial intelligence", "programming", "computers"], "ageBand": "students", "groupType": "student", "groupSize": 3, "timeBudget": 60, "mobility": "none", "crowdTolerance": "high"},
        
        # Physics and Science
        {"interests": ["physics", "waves", "motion", "science"], "ageBand": "students", "groupType": "student", "groupSize": 2, "timeBudget": 60, "mobility": "none", "crowdTolerance": "medium"},
        {"interests": ["science", "experiments", "hands-on"], "ageBand": "kids", "groupType": "family", "groupSize": 4, "timeBudget": 90, "mobility": "none", "crowdTolerance": "medium"},
        
        # Astronomy and Space
        {"interests": ["astronomy", "stars", "planets", "space"], "ageBand": "researchers", "groupType": "adult", "groupSize": 1, "timeBudget": 45, "mobility": "none", "crowdTolerance": "low"},
        {"interests": ["space", "universe", "celestial"], "ageBand": "students", "groupType": "student", "groupSize": 2, "timeBudget": 30, "mobility": "none", "crowdTolerance": "medium"},
        
        # Technology and Innovation
        {"interests": ["technology", "innovation", "stem", "engineering"], "ageBand": "researchers", "groupType": "student", "groupSize": 3, "timeBudget": 120, "mobility": "none", "crowdTolerance": "high"},
        {"interests": ["innovation", "creative", "hands-on"], "ageBand": "students", "groupType": "student", "groupSize": 2, "timeBudget": 60, "mobility": "none", "crowdTolerance": "medium"},
        
        # Interactive exhibits
        {"interests": ["interactive", "hands-on", "family"], "ageBand": "kids", "groupType": "family", "groupSize": 4, "timeBudget": 90, "mobility": "none", "crowdTolerance": "medium"},
        {"interests": ["interactive", "experiments"], "ageBand": "students", "groupType": "student", "groupSize": 2, "timeBudget": 60, "mobility": "none", "crowdTolerance": "high"},
        
        # General science
        {"interests": ["science", "education", "learning"], "ageBand": "students", "groupType": "student", "groupSize": 5, "timeBudget": 120, "mobility": "none", "crowdTolerance": "high"},
        {"interests": ["science", "museum", "exhibits"], "ageBand": "adults", "groupType": "adult", "groupSize": 2, "timeBudget": 90, "mobility": "none", "crowdTolerance": "low"},
        
        # Additional diverse profiles for better coverage
        {"interests": ["planetarium", "stars", "night sky"], "ageBand": "students", "groupType": "student", "groupSize": 2, "timeBudget": 45, "mobility": "none", "crowdTolerance": "medium"},
        {"interests": ["taramandal", "astronomy", "cosmos"], "ageBand": "researchers", "groupType": "adult", "groupSize": 1, "timeBudget": 30, "mobility": "none", "crowdTolerance": "low"},
        {"interests": ["wave motion", "physics", "mechanics"], "ageBand": "students", "groupType": "student", "groupSize": 2, "timeBudget": 60, "mobility": "none", "crowdTolerance": "medium"},
        {"interests": ["development", "lab", "stores"], "ageBand": "researchers", "groupType": "adult", "groupSize": 1, "timeBudget": 60, "mobility": "none", "crowdTolerance": "low"},
        {"interests": [], "ageBand": "adults", "groupType": "adult", "groupSize": 1, "timeBudget": 60, "mobility": "none", "crowdTolerance": "medium"},  # Empty interests fallback
    ]


def label_exhibit(user: Dict[str, Any], exhibit: Dict[str, Any]) -> int:
    # Use advanced features if available for better labeling
    if HAS_ADVANCED:
        try:
            f = build_advanced_features(user, exhibit)
            # Add expanded features to scoring
            expanded_bonus = (
                f.get("expanded_coverage_full", 0) * 2.0 +
                f.get("bigram_overlap", 0) * 1.5 +
                f.get("expanded_tf_idf_full", 0) * 1.0
            )
        except Exception:
            f = build_feature_vector(user, exhibit)
            expanded_bonus = 0.0
    else:
        f = build_feature_vector(user, exhibit)
        expanded_bonus = 0.0
    
    interests = [x.strip() for x in (user.get("interests") or []) if x]
    
    # If no interests, return low relevance
    if not interests:
        return 0
    
    # Enhanced label: STRICT matching - prioritize exact interest matches
    # Maximum weights for best ranking with strict interest matching
    tag_hits = f.get("tag_hits", 0)
    category_hits = f.get("category_hits", 0)
    interest_jaccard = f.get("interest_jaccard", 0)
    
    # CRITICAL: If no direct tag/category match, heavily penalize
    has_direct_match = tag_hits > 0 or category_hits > 0 or interest_jaccard > 0.3
    
    score = (
        10.0 * tag_hits  # CRITICAL: Direct tag matches (increased from 6.0)
        + 8.0 * category_hits  # CRITICAL: Category matches (increased from 5.5)
        + 7.0 * interest_jaccard  # CRITICAL: Tag/feature overlap (increased from 4.5)
        + 5.0 * f.get("desc_similarity", 0)  # Text similarity
        + 4.0 * f.get("category_similarity", 0)  # Category similarity
        + 3.0 * f.get("interest_hits", 0)  # Text matches in name/desc
        + 3.0 * f.get("name_similarity", 0)  # Name similarity
        + 2.0 * f.get("name_hits", 0)  # Name matches
        + 2.0 * f.get("category_match", 0)  # Enhanced category match
        + 1.5 * f.get("age_match", 0)
        + 1.2 * f.get("group_match", 0)
        + 0.8 * f.get("desc_hits", 0)  # Description hits
        + 0.3 * f.get("category_known", 0)
        + expanded_bonus  # Bonus from advanced features
    )
    
    # STRICT PENALTY: If no direct match, heavily reduce score
    if not has_direct_match:
        score *= 0.1  # Reduce to 10% if no direct match
    
    # STRICT BONUS: Heavily reward direct interest matches
    strong_signals = sum([
        1 if f.get("tag_hits", 0) > 0 else 0,
        1 if f.get("category_hits", 0) > 0 else 0,
        1 if f.get("interest_jaccard", 0) > 0.3 else 0,  # Direct overlap
        1 if f.get("desc_similarity", 0) > 0.3 else 0,
        1 if f.get("expanded_coverage_full", 0) > 0.3 else 0,
    ])
    # CRITICAL: Direct tag/category matches get huge bonus
    if tag_hits > 0 or category_hits > 0:
        score += 5.0  # Massive bonus for direct matches
    if strong_signals >= 3:
        score += 3.0  # Big bonus for multiple strong matches
    elif strong_signals >= 2:
        score += 2.0  # Medium bonus
    
    # Quantize to integer relevance levels 0..5 with STRICT matching
    # Direct matches get highest scores
    if has_direct_match:
        if score >= 20.0:
            return 5  # Perfect direct match - should be top-1
        if score >= 12.0:
            return 4  # Excellent direct match - should be top-3
        if score >= 8.0:
            return 3  # Good direct match - should be top-10
        if score >= 4.0:
            return 2  # Moderate direct match - should be top-20
        if score >= 1.5:
            return 1  # Weak direct match - should be top-50
    # No direct match - very low score
    if score >= 2.0:
        return 1  # Only if score is still high despite no direct match
    return 0  # No match


def build_training_arrays(users: List[Dict[str, Any]], exhibits: List[Dict[str, Any]], use_advanced: bool = True):
    X_rows: List[List[float]] = []
    y_vals: List[int] = []
    qid_counts: List[int] = []
    feature_keys = ADVANCED_FEATURE_KEYS if (use_advanced and HAS_ADVANCED) else FEATURE_KEYS
    
    for _qid, user in enumerate(users):
        count = 0
        for ex in exhibits:
            if use_advanced and HAS_ADVANCED:
                fv = build_advanced_features(user, ex)
            else:
                fv = build_feature_vector(user, ex)
            X_rows.append([fv.get(k, 0.0) for k in feature_keys])
            y_vals.append(label_exhibit(user, ex))
            count += 1
        qid_counts.append(count)
    X = np.array(X_rows, dtype=np.float32)
    y = np.array(y_vals, dtype=np.int32)
    return X, y, qid_counts, feature_keys


def train_lambdamart(X: np.ndarray, y: np.ndarray, qid_counts: List[int], feature_names: List[str] = None) -> Dict[str, Any]:
    # Split into train/validation for better evaluation
    train_indices = []
    val_indices = []
    idx = 0
    for count in qid_counts:
        # Use 80% for training, 20% for validation
        split_point = int(count * 0.8)
        train_indices.extend(range(idx, idx + split_point))
        val_indices.extend(range(idx + split_point, idx + count))
        idx += count
    
    X_train = X[train_indices] if train_indices else X
    y_train = y[train_indices] if train_indices else y
    X_val = X[val_indices] if val_indices else None
    y_val = y[val_indices] if val_indices else None
    
    # Build train groups
    train_qid_counts = []
    idx = 0
    for count in qid_counts:
        split_point = int(count * 0.8)
        train_qid_counts.append(split_point)
        idx += count
    
    feature_names = feature_names or FEATURE_KEYS
    train_data = lgb.Dataset(X_train, label=y_train, group=train_qid_counts, feature_name=feature_names)
    
    # Validation set if available
    valid_data = None
    if X_val is not None and len(X_val) > 0:
        val_qid_counts = [c - int(c * 0.8) for c in qid_counts if c > int(c * 0.8)]
        if val_qid_counts:
            valid_data = lgb.Dataset(X_val, label=y_val, group=val_qid_counts, reference=train_data)
    
    params = {
        "objective": "lambdarank",
        "metric": ["ndcg"],
        "ndcg_eval_at": [1, 3, 5, 10],  # Focus on top-K positions for MRR
        "learning_rate": 0.02,  # Lower for better convergence
        "num_leaves": 255,  # Maximum capacity
        "min_data_in_leaf": 2,  # Allow more splits
        "max_depth": 15,  # Deeper trees for better precision
        "feature_pre_filter": False,
        "verbosity": -1,
        "force_col_wise": True,
        "boosting_type": "gbdt",
        "num_threads": 1,
        "lambda_l1": 0.05,  # Reduced regularization for better recall
        "lambda_l2": 0.05,
        "min_gain_to_split": 0.0,  # Allow more splits
        "max_bin": 255,  # More bins for precision
    }
    
    # More rounds with validation monitoring for better convergence
    num_rounds = min(500, max(200, len(qid_counts) * 6))
    
    callbacks = [lgb.log_evaluation(50)]  # Log every 50 rounds
    if valid_data:
        callbacks.append(lgb.early_stopping(30))  # Early stopping with validation
    
    model = lgb.train(
        params, 
        train_data,
        valid_sets=[valid_data] if valid_data else None,
        valid_names=["validation"] if valid_data else None,
        num_boost_round=num_rounds, 
        callbacks=callbacks
    )
    return {
        "model": model, 
        "params": params,
        "train_data": train_data,
        "valid_data": valid_data,
        "num_rounds": num_rounds,
        "callbacks": callbacks
    }


def main() -> int:
    backend_url = os.getenv("BACKEND_URL", "http://localhost:5000/api")
    base = Path(__file__).resolve().parent
    models_dir = base / "models"
    artifacts_dir = base / "artifacts"
    models_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    exhibits = fetch_exhibits(backend_url)
    if not exhibits:
        print("Error: No exhibits found. Cannot train ranker.")
        return 1
    
    print(f"Loaded {len(exhibits)} exhibits")
    users = synthetic_user_profiles()
    print(f"Generated {len(users)} user profiles")
    
    # Train with advanced features
    use_advanced = HAS_ADVANCED
    print(f"Using advanced features: {use_advanced}")
    X, y, qid_counts, feature_keys = build_training_arrays(users, exhibits, use_advanced=use_advanced)
    print(f"Built training data: {len(X)} samples, {len(users)} queries, {len(feature_keys)} features")
    out = train_lambdamart(X, y, qid_counts, feature_names=feature_keys)
    model: lgb.Booster = out["model"]
    params = out.get("params")
    train_data = out.get("train_data")
    valid_data = out.get("valid_data")
    num_rounds = out.get("num_rounds", 200)
    callbacks = out.get("callbacks", [])

    # Save model and feature keys
    model_path = models_dir / "ranker.txt"
    feature_keys_path = models_dir / "feature_keys.json"
    model.save_model(str(model_path))
    feature_keys_path.write_text(json.dumps(feature_keys, indent=2))
    
    # Also save secondary model with different parameters for ensemble
    if use_advanced and params and train_data:
        print("Training secondary model for ensemble...")
        params_secondary = params.copy()
        params_secondary["learning_rate"] = 0.03  # Different learning rate
        params_secondary["num_leaves"] = 191  # Different structure
        params_secondary["max_depth"] = 13  # Slightly different depth
        params_secondary["min_data_in_leaf"] = 3
        model_secondary = lgb.train(
            params_secondary,
            train_data,
            valid_sets=[valid_data] if valid_data else None,
            valid_names=["validation"] if valid_data else None,
            num_boost_round=int(num_rounds * 0.8),  # Fewer rounds for diversity
            callbacks=callbacks
        )
        secondary_path = models_dir / "ranker_secondary.txt"
        model_secondary.save_model(str(secondary_path))
        print(f"Secondary model saved to: {secondary_path}")

    # Simple metric: average label@top10 using model preds on training
    preds = model.predict(X)
    # Compute mean label among top-10 per query
    top_labels: List[float] = []
    idx = 0
    for count in qid_counts:
        q_slice = slice(idx, idx + count)
        order = np.argsort(-preds[q_slice])  # descending
        top = y[q_slice][order][:10]
        top_labels.append(float(np.mean(top)))
        idx += count
    avg_top10 = float(np.mean(top_labels)) if top_labels else 0.0
    (artifacts_dir / "metrics.json").write_text(json.dumps({"avg_label_top10": avg_top10}, indent=2))

    print(f"Trained ranker saved to: {model_path}")
    print(f"Metrics saved to: {artifacts_dir / 'metrics.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


