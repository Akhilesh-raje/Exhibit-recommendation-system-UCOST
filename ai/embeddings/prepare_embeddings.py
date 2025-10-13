import json
import os
from pathlib import Path
from typing import List, Dict

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
except Exception as e:
    raise SystemExit("Please install sentence-transformers: pip install sentence-transformers numpy")

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / 'data'
INPUT_JSON = DATA_DIR / 'exhibits.template.json'
NORMALIZED_JSON = DATA_DIR / 'exhibits.normalized.json'
EMBEDDINGS_JSON = DATA_DIR / 'exhibit_embeddings.json'
MODEL_NAME = 'all-MiniLM-L6-v2'

TEXT_FIELDS = ['name', 'description', 'category']


def load_exhibits(path: Path) -> List[Dict]:
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def normalize(exhibits: List[Dict]) -> List[Dict]:
    normalized = []
    for e in exhibits:
        ne = dict(e)
        # Lowercase category; enforce coordinates structure
        ne['category'] = str(e.get('category', 'other')).lower().strip() or 'other'
        coord = e.get('coordinates') or {}
        ne['coordinates'] = {
            'x': float(coord.get('x', 0)),
            'y': float(coord.get('y', 0)),
            'floor': str(coord.get('floor', 'ground')).lower()
        }
        # Ensure averageTime
        ne['averageTime'] = int(e.get('averageTime', 5))
        normalized.append(ne)
    return normalized


def embed_texts(model: SentenceTransformer, items: List[str]) -> List[List[float]]:
    vectors = model.encode(items, normalize_embeddings=True, show_progress_bar=True)
    return vectors.tolist()


def main():
    exhibits = load_exhibits(INPUT_JSON)
    exhibits = normalize(exhibits)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with NORMALIZED_JSON.open('w', encoding='utf-8') as f:
        json.dump(exhibits, f, ensure_ascii=False, indent=2)

    # Build texts
    texts = []
    for e in exhibits:
        parts = [str(e.get('name', '')), str(e.get('description', '')), f"category: {e.get('category','')}" ]
        texts.append('. '.join([p for p in parts if p]))

    print(f"Loaded {len(exhibits)} exhibits. Embedding with {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    vectors = embed_texts(model, texts)

    out = []
    for e, v in zip(exhibits, vectors):
        out.append({
            'id': e['id'],
            'vector': v,
            'category': e.get('category'),
            'averageTime': e.get('averageTime'),
            'coordinates': e.get('coordinates'),
            'rating': e.get('rating', None),
            'ageRange': e.get('ageRange', None),
            'exhibitType': e.get('exhibitType', None),
            'difficulty': e.get('difficulty', None),
            'interactiveFeatures': e.get('interactiveFeatures', []),
        })

    with EMBEDDINGS_JSON.open('w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Saved embeddings → {EMBEDDINGS_JSON}")


if __name__ == '__main__':
    main()