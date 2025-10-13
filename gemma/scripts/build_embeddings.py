import os
import json
import faiss
import torch
from PIL import Image
from typing import List, Dict, Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(ROOT, 'dataset')
EMB_DIR = os.path.join(ROOT, 'embeddings')

def load_clip():
    import clip
    model, preprocess = clip.load('ViT-B/32', device='cpu')
    return model, preprocess

def encode_texts(model, texts: List[str]):
    import clip
    with torch.no_grad():
        tokens = clip.tokenize(texts)
        feats = model.encode_text(tokens)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.cpu().numpy()

def encode_images(model, preprocess, image_paths: List[str]):
    images = []
    for p in image_paths:
        try:
            images.append(preprocess(Image.open(p).convert('RGB')))
        except Exception:
            pass
    if not images:
        return None
    batch = torch.stack(images)
    with torch.no_grad():
        feats = model.encode_image(batch)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        return feats.cpu().numpy()

def main():
    os.makedirs(EMB_DIR, exist_ok=True)
    manifest_path = os.path.join(DATA_DIR, 'training_data.jsonl')
    if not os.path.exists(manifest_path):
        print('Missing dataset/training_data.jsonl. Run preprocess.py first.')
        return
    model, preprocess = load_clip()

    texts: List[str] = []
    records: List[Dict[str, Any]] = []
    ids: List[str] = []
    with open(manifest_path, 'r', encoding='utf-8') as f:
        for line in f:
            j = json.loads(line)
            ctx = j.get('context') or {}
            t = ' '.join([str(ctx.get('name','')), str(ctx.get('description','')), str(ctx.get('category',''))]).strip()
            texts.append(t if t else 'unknown')
            records.append(j)
            ids.append(j.get('id') or '')

    text_vecs = encode_texts(model, texts)
    dim = text_vecs.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(text_vecs)
    faiss.write_index(index, os.path.join(EMB_DIR, 'faiss.index'))
    with open(os.path.join(EMB_DIR, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump({'count': len(texts), 'dim': dim}, f)
    with open(os.path.join(EMB_DIR, 'rows.json'), 'w', encoding='utf-8') as f:
        json.dump(ids, f)
    print('Built FAISS index for text embeddings.')

if __name__ == '__main__':
    main()


