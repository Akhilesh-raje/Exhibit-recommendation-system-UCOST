import json
import os
import sys
from typing import List, Dict, Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BACKEND_DATA = os.path.join(ROOT, 'project', 'backend', 'backend')
EMBED_DATA = os.path.join(ROOT, 'data')

def main():
    # This script collects exhibits from the backend DB export or via API and builds a JSONL manifest
    # Each line contains: {id, text, tags, image_paths, metadata}
    manifests: List[Dict[str, Any]] = []

    # If a consolidated JSON exists (e.g., exhibits.template.json), use it; otherwise instruct to export
    template_json = os.path.join(ROOT, 'data', 'exhibits.template.json')
    if not os.path.exists(template_json):
        print('Missing data/exhibits.template.json; export from backend first.')
        sys.exit(1)

    with open(template_json, 'r', encoding='utf-8') as f:
        exhibits = json.load(f)

    for ex in exhibits:
        text_parts = [ex.get('name',''), ex.get('description',''), ex.get('category','')]
        tags = ex.get('interactiveFeatures', []) or []
        images = ex.get('images', []) or []
        loc = ex.get('mapLocation') or {}
        metadata = {
            'averageTime': ex.get('averageTime'),
            'rating': ex.get('rating'),
            'floor': loc.get('floor'),
            'x': loc.get('x'),
            'y': loc.get('y'),
        }
        manifests.append({
            'id': ex.get('id'),
            'text': ' \n'.join([str(t) for t in text_parts if t]),
            'tags': tags,
            'images': images,
            'meta': metadata,
        })

    out_dir = os.path.join(ROOT, 'gemma', 'data')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'exhibits.jsonl')
    with open(out_path, 'w', encoding='utf-8') as out:
        for m in manifests:
            out.write(json.dumps(m, ensure_ascii=False) + '\n')
    print(f'Wrote manifest: {out_path} ({len(manifests)} entries)')

if __name__ == '__main__':
    main()


