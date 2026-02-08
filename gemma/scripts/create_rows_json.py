#!/usr/bin/env python3
"""
Create rows.json from existing training_data.jsonl
This maps FAISS index positions to exhibit IDs
"""
import os
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(ROOT, 'dataset')
EMB_DIR = os.path.join(ROOT, 'embeddings')

def main():
    manifest_path = os.path.join(DATA_DIR, 'training_data.jsonl')
    rows_path = os.path.join(EMB_DIR, 'rows.json')
    
    if not os.path.exists(manifest_path):
        print(f"❌ Training data not found: {manifest_path}")
        print("   Run rebuild_embeddings.py first to create it")
        return False
    
    ids = []
    with open(manifest_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                j = json.loads(line)
                exhibit_id = j.get('id') or ''
                ids.append(exhibit_id)
            except:
                ids.append('')
    
    os.makedirs(EMB_DIR, exist_ok=True)
    with open(rows_path, 'w', encoding='utf-8') as f:
        json.dump(ids, f)
    
    print(f"✅ Created rows.json with {len(ids)} exhibit IDs")
    print(f"   Saved to: {rows_path}")
    return True

if __name__ == '__main__':
    main()

