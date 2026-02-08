"""
Debug script to test ranker predictions directly.
"""

import json
from pathlib import Path
from typing import Any, Dict, List

import lightgbm as lgb
import numpy as np

from features import build_feature_vector, FEATURE_KEYS

# Try advanced features
try:
    from advanced_features import build_advanced_features, ADVANCED_FEATURE_KEYS
    HAS_ADVANCED = True
except ImportError:
    HAS_ADVANCED = False
    ADVANCED_FEATURE_KEYS = FEATURE_KEYS

base = Path(__file__).parent
model_path = base / "models" / "ranker.txt"
secondary_path = base / "models" / "ranker_secondary.txt"

# Load models
print(f"Loading primary model from: {model_path}")
if not model_path.exists():
    print("ERROR: Primary model not found!")
    exit(1)

model = lgb.Booster(model_file=str(model_path))
print("Primary model loaded")

if secondary_path.exists():
    model_secondary = lgb.Booster(model_file=str(secondary_path))
    print("Secondary model loaded")
else:
    model_secondary = None
    print("⚠ Secondary model not found")

# Load feature keys
feature_keys_path = base / "models" / "feature_keys.json"
if feature_keys_path.exists():
    with open(feature_keys_path, 'r') as f:
        saved_feature_keys = json.load(f)
    print(f"Loaded {len(saved_feature_keys)} feature keys from training")
    print(f"  Features: {saved_feature_keys[:5]}...")
else:
    saved_feature_keys = FEATURE_KEYS
    print(f"WARNING: Using default {len(FEATURE_KEYS)} feature keys")

# Test user and exhibit
test_user = {
    "interests": ["ai", "robotics", "technology"],
    "ageBand": "researchers",
    "groupType": "student",
    "groupSize": 2,
    "timeBudget": 90,
    "mobility": "none",
    "crowdTolerance": "medium"
}

test_exhibit = {
    "id": "test-1",
    "name": "AI and Robotics Lab",
    "description": "Interactive exhibit showcasing artificial intelligence and robotics technology",
    "category": "Technology",
    "exhibitType": "Interactive",
    "ageRange": "researchers",
    "features": ["ai", "robotics", "machine learning"],
    "interactiveFeatures": ["hands-on", "experiments"],
    "tags": ["ai", "robotics", "technology"]
}

print("\n" + "="*60)
print("Testing Feature Extraction")
print("="*60)

# Test basic features
fv_basic = build_feature_vector(test_user, test_exhibit)
print(f"\nBasic features ({len(FEATURE_KEYS)}):")
for i, key in enumerate(FEATURE_KEYS[:10]):
    print(f"  {key}: {fv_basic.get(key, 0):.4f}")

# Test advanced features
if HAS_ADVANCED:
    try:
        fv_advanced = build_advanced_features(test_user, test_exhibit)
        print(f"\nAdvanced features ({len(ADVANCED_FEATURE_KEYS)}):")
        for i, key in enumerate(ADVANCED_FEATURE_KEYS[:10]):
            print(f"  {key}: {fv_advanced.get(key, 0):.4f}")
        
        # Check dimension match
        if len(saved_feature_keys) == len(ADVANCED_FEATURE_KEYS):
            print(f"\nFeature dimensions match: {len(saved_feature_keys)}")
        else:
            print(f"\nWARNING: Feature dimension mismatch!")
            print(f"  Training: {len(saved_feature_keys)}")
            print(f"  Inference: {len(ADVANCED_FEATURE_KEYS)}")
    except Exception as e:
        print(f"\nWARNING: Advanced features failed: {e}")
        HAS_ADVANCED = False

print("\n" + "="*60)
print("Testing Model Predictions")
print("="*60)

# Build feature vector matching training
if len(saved_feature_keys) == len(ADVANCED_FEATURE_KEYS) and HAS_ADVANCED:
    fv = build_advanced_features(test_user, test_exhibit)
    feat_vec = [fv.get(k, 0.0) for k in saved_feature_keys]
    print(f"Using advanced features ({len(feat_vec)} dims)")
elif len(saved_feature_keys) == len(FEATURE_KEYS):
    fv = build_feature_vector(test_user, test_exhibit)
    feat_vec = [fv.get(k, 0.0) for k in saved_feature_keys]
    print(f"Using basic features ({len(feat_vec)} dims)")
else:
    # Use saved feature keys order
    if HAS_ADVANCED:
        fv = build_advanced_features(test_user, test_exhibit)
    else:
        fv = build_feature_vector(test_user, test_exhibit)
    feat_vec = [fv.get(k, 0.0) for k in saved_feature_keys]
    print(f"Using saved feature order ({len(feat_vec)} dims)")

X = np.array([feat_vec], dtype=np.float32)
print(f"Feature vector shape: {X.shape}")
print(f"Feature vector sample: {feat_vec[:5]}")

# Predict with primary model
try:
    pred_primary = model.predict(X)
    print(f"\nPrimary model prediction: {pred_primary[0]:.6f}")
except Exception as e:
    print(f"\n✗ Primary model prediction failed: {e}")
    pred_primary = [0.0]

# Predict with secondary model
if model_secondary:
    try:
        pred_secondary = model_secondary.predict(X)
        print(f"Secondary model prediction: {pred_secondary[0]:.6f}")
        
        # Ensemble prediction
        ensemble_pred = pred_primary[0] * 0.6 + pred_secondary[0] * 0.4
        print(f"Ensemble prediction: {ensemble_pred:.6f}")
    except Exception as e:
        print(f"ERROR: Secondary model prediction failed: {e}")

print("\n" + "="*60)
print("Summary")
print("="*60)
print(f"Feature dimensions: {len(feat_vec)}")
print(f"Model expects: {model.num_feature()} features")
if model.num_feature() != len(feat_vec):
    print(f"ERROR: DIMENSION MISMATCH! Model expects {model.num_feature()}, got {len(feat_vec)}")
else:
    print("Dimensions match!")
print(f"Prediction score: {pred_primary[0]:.6f}")
if pred_primary[0] > 0:
    print("Model produces positive scores")
else:
    print("WARNING: Model produces non-positive scores")

