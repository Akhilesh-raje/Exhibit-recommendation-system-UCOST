import os
import json
import csv
from typing import Dict, Any

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(ROOT, 'dataset')

def main():
    exhibits_csv = os.path.join(DATA_DIR, 'exhibits.csv')
    metadata_json = os.path.join(DATA_DIR, 'metadata.json')
    out_jsonl = os.path.join(DATA_DIR, 'training_data.jsonl')

    if not os.path.exists(exhibits_csv):
        print('Missing dataset/exhibits.csv')
        return
    if not os.path.exists(metadata_json):
        print('Missing dataset/metadata.json')
        return

    with open(metadata_json, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    meta_by_id: Dict[str, Dict[str, Any]] = {m.get('id'): m for m in meta}

    rows = []
    with open(exhibits_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)

    with open(out_jsonl, 'w', encoding='utf-8') as out:
        for r in rows:
            ex_id = r.get('id')
            m = meta_by_id.get(ex_id, {})
            instruction = 'Recommend this exhibit given a user profile and interests'
            context = {
                'name': r.get('name'),
                'description': r.get('description'),
                'category': r.get('category'),
                'tags': (m.get('tags') or []),
                'location': m.get('location'),
                'avgTime': r.get('averageTime'),
                'rating': r.get('rating')
            }
            sample = {
                'id': ex_id,
                'instruction': instruction,
                'context': context,
                'response': '<<label_to_fill_during_training>>'
            }
            out.write(json.dumps(sample, ensure_ascii=False) + '\n')
    print(f'Wrote {out_jsonl}')

if __name__ == '__main__':
    main()


