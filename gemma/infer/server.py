from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import os
import json
import faiss
import numpy as np
import clip
import torch

app = FastAPI(title='Gemma Recommender', version='0.1')

class RecommendRequest(BaseModel):
    query: str
    limit: int = 10

_index = None
_meta = None
_rows = None
_clip = None
_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def _load_index():
    global _index, _meta
    if _index is None:
        idx_path = os.path.join(_BASE, 'embeddings', 'faiss.index')
        meta_path = os.path.join(_BASE, 'embeddings', 'meta.json')
        if os.path.exists(idx_path):
            _index = faiss.read_index(idx_path)
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                _meta = json.load(f)
        rows_path = os.path.join(_BASE, 'embeddings', 'rows.json')
        if os.path.exists(rows_path):
            with open(rows_path, 'r', encoding='utf-8') as f:
                _rows = json.load(f)

def _load_clip():
    global _clip
    if _clip is None:
        model, preprocess = clip.load('ViT-B/32', device='cpu')
        _clip = (model, preprocess)

def _embed_text(text: str):
    import clip as _c
    model, _ = _clip
    with torch.no_grad():
        tokens = _c.tokenize([text])
        feats = model.encode_text(tokens)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.cpu().numpy()

@app.get('/health')
def health():
    _load_index()
    return {'status': 'ok', 'indexed': bool(_index)}

@app.post('/recommend')
def recommend(req: RecommendRequest):
    _load_index()
    _load_clip()
    if _index is None:
        return {'exhibits': [], 'reason': 'index not built'}
    vec = _embed_text(req.query)
    D, I = _index.search(vec.astype(np.float32), req.limit)
    results = []
    for i, d in zip(I[0], D[0]):
        ex_id = None
        if _rows and 0 <= int(i) < len(_rows):
            ex_id = _rows[int(i)]
        results.append({'id': ex_id if ex_id else int(i), 'score': float(d)})
    return {'exhibits': results}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8011)


