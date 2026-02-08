import csv
import json
from pathlib import Path

base_dir = Path('project')
authoritative = base_dir / 'docs' / 'exhibits_detailed.csv'
output = base_dir / 'chatbot-mini' / 'docs' / 'exhibits.csv'

if not authoritative.exists():
    raise SystemExit(f"Authoritative dataset not found: {authoritative}")

rows_out = []
with authoritative.open('r', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        exhibit_id = (row.get('id') or '').strip()
        name = (row.get('name') or '').strip()
        if not exhibit_id or not name:
            continue
        def first_non_empty(*keys):
            for key in keys:
                if key in row and row[key]:
                    return row[key]
            return ''
        features_raw = first_non_empty('features', 'interactiveFeatures')
        features_str = ''
        if isinstance(features_raw, str):
            features_raw = features_raw.strip()
            if features_raw:
                try:
                    parsed = json.loads(features_raw)
                    if isinstance(parsed, list):
                        features_str = ', '.join(str(x) for x in parsed if str(x).strip())
                    elif isinstance(parsed, dict):
                        features_str = ', '.join(f"{k}:{v}" for k, v in parsed.items())
                    else:
                        features_str = str(parsed)
                except Exception:
                    features_str = features_raw
        elif isinstance(features_raw, list):
            features_str = ', '.join(str(x) for x in features_raw if str(x).strip())

        images_count = first_non_empty('imagesCount', 'images_count', 'imageCount')
        if isinstance(images_count, str):
            images_count = images_count.strip()
        if not images_count:
            images_raw = row.get('images') or ''
            count = 0
            if isinstance(images_raw, str) and images_raw.strip():
                try:
                    parsed_imgs = json.loads(images_raw)
                    if isinstance(parsed_imgs, list):
                        count = len(parsed_imgs)
                    elif isinstance(parsed_imgs, dict):
                        count = len(parsed_imgs)
                except Exception:
                    pass
            images_count = str(count)
        rows_out.append({
            'id': exhibit_id,
            'name': name,
            'category': first_non_empty('category', 'exhibitType'),
            'floor': first_non_empty('floor', 'location'),
            'ageRange': first_non_empty('ageRange', 'age_group'),
            'type': first_non_empty('type', 'exhibitType'),
            'environment': first_non_empty('environment'),
            'features': features_str,
            'imagesCount': images_count,
            'createdAt': first_non_empty('createdAt'),
            'updatedAt': first_non_empty('updatedAt'),
            'description': row.get('description', '')
        })

fieldnames = ['id','name','category','floor','ageRange','type','environment','features','imagesCount','createdAt','updatedAt','description']
output.parent.mkdir(parents=True, exist_ok=True)
with output.open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows_out:
        writer.writerow(row)

print(f"Wrote {len(rows_out)} exhibits to {output}")
