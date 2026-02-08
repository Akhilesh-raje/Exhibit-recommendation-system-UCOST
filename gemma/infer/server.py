from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import json
import faiss
import numpy as np
import clip
import torch

app = FastAPI(title='Gemma Recommender', version='0.1')

# Enable CORS to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecommendRequest(BaseModel):
    query: str
    limit: int = 10

_index = None
_meta = None
_rows = None
_clip = None
_BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def _load_index():
    global _index, _meta, _rows
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
        else:
            # Initialize as empty list if rows.json doesn't exist yet
            _rows = None

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
    indexed = bool(_index)
    has_rows = _rows is not None and len(_rows) > 0 if _rows else False
    count = _index.ntotal if _index else 0
    return {
        'status': 'ok',
        'indexed': indexed,
        'has_rows': has_rows,
        'exhibit_count': count if indexed else 0
    }

@app.post('/recommend')
def recommend(req: RecommendRequest):
    global _rows
    try:
        _load_index()
        _load_clip()
        
        if _index is None:
            return {'exhibits': [], 'reason': 'index not built', 'error': 'FAISS index file not found. Please build embeddings first.'}
        
        if _rows is None:
            # Try to create rows from meta.json or use index numbers
            print("Warning: rows.json not found, using index numbers as IDs")
            _rows = [str(i) for i in range(_index.ntotal)]
        
        vec = _embed_text(req.query)
        D, I = _index.search(vec.astype(np.float32), req.limit)
        results = []
        
        for i, d in zip(I[0], D[0]):
            ex_id = None
            idx = int(i)
            if _rows and 0 <= idx < len(_rows):
                ex_id = _rows[idx]
            else:
                ex_id = str(idx)
            
            # Convert score (distance) to similarity score (higher is better)
            # FAISS IndexFlatIP returns inner product, so higher is better
            # If using L2, we'd need to convert distance to similarity
            similarity_score = float(d) if d > 0 else 0.0
            results.append({'id': ex_id, 'score': similarity_score})
        
        return {'exhibits': results}
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        return {'exhibits': [], 'reason': 'error', 'error': error_msg}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8011)


