import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV

# Usage:
#   pip install pandas scikit-learn
#   python tools/train_reranker.py
# Input:
#   data/rerank_labels.csv with columns:
#   query, candidate_id, gemma_score, tfidf_cosine, jaccard_overlap,
#   csv_exact_flag, description_length, top1_delta, label (0/1)
# Output:
#   models/reranker.json

data_path = Path('data/rerank_labels.csv')
if not data_path.exists():
    raise SystemExit('Missing data/rerank_labels.csv')

df = pd.read_csv(data_path)
feature_cols = ['gemma_score','tfidf_cosine','jaccard_overlap','csv_exact_flag','description_length','top1_delta']
X = df[feature_cols].values
y = df['label'].values

base = LogisticRegression(max_iter=2000)
clf = CalibratedClassifierCV(base_estimator=base, cv=5, method='sigmoid')
pipeline = Pipeline([('scaler', StandardScaler()), ('clf', clf)])
pipeline.fit(X, y)

# Extract scaler and fit a simple LR on scaled features for portable inference
scaler = pipeline.named_steps['scaler']
X_scaled = scaler.transform(X)
lr = LogisticRegression(max_iter=2000).fit(X_scaled, y)
coefs = lr.coef_.ravel().tolist()
intercept = float(lr.intercept_[0])

export = {
    'feature_cols': feature_cols,
    'scaler_mean': scaler.mean_.tolist(),
    'scaler_scale': scaler.scale_.tolist(),
    'coef': coefs,
    'intercept': intercept,
}

Path('models').mkdir(parents=True, exist_ok=True)
with open('models/reranker.json', 'w') as f:
    json.dump(export, f, indent=2)

print('Exported models/reranker.json')
