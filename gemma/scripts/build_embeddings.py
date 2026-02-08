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
            
            # Include ALL fields for comprehensive search
            # CLIP has a 77 TOKEN limit (not characters), so we need aggressive truncation
            # Rough estimate: 1 token ≈ 4 characters, so 77 tokens ≈ 300 characters max
            
            name = str(ctx.get('name', ''))
            description = str(ctx.get('description', ''))
            category = str(ctx.get('category', ''))
            location = str(ctx.get('location', ''))
            
            # Truncate description aggressively - keep first 200 chars max
            if len(description) > 200:
                description = description[:197] + '...'
            
            # Build text with priority: name, description, category, location
            # These are the most important for search
            text_parts = [name]
            if description:
                text_parts.append(description)
            if category:
                text_parts.append(category)
            if location:
                text_parts.append(location)
            
            # Add educational value (truncated to 50 chars)
            if ctx.get('educationalValue'):
                edu = str(ctx.get('educationalValue'))[:50]
                if edu:
                    text_parts.append(edu)
            
            # Add scientific name if short
            if ctx.get('scientificName'):
                sci_name = str(ctx.get('scientificName'))
                if len(sci_name) < 30:
                    text_parts.append(sci_name)
            
            # Combine and truncate to ~280 chars (safe for 77 tokens)
            t = ' '.join([p for p in text_parts if p]).strip()
            
            # Aggressive truncation to ensure it fits (280 chars ≈ 70 tokens, safe margin)
            if len(t) > 280:
                # Try to preserve name and category
                name_cat = f"{name} {category}".strip()
                remaining = 280 - len(name_cat) - 10  # 10 for spacing/ellipsis
                if remaining > 50 and description:
                    # Include truncated description
                    desc = description[:remaining] if len(description) <= remaining else description[:remaining-3] + '...'
                    t = f"{name_cat} {desc}".strip()
                else:
                    t = name_cat[:280]
            
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


