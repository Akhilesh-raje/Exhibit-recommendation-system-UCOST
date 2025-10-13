import csv
import json
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(ROOT, 'dataset')

CATEGORIES = ['space-and-astronomy','earth-science','ai-and-robotics','technology','physics','environment']
TAGS = {
  'space-and-astronomy': ['planets','stars','galaxy','rocket','astronomy','space'],
  'earth-science': ['geology','fossils','strata','mountain','earth','cave'],
  'ai-and-robotics': ['robotics','ai','automation','coding','electronics'],
  'technology': ['engineering','computing','innovation','electronics'],
  'physics': ['energy','motion','forces','quantum','optics'],
  'environment': ['nature','climate','ecosystem','biodiversity']
}

def main(n=200):
    os.makedirs(DATA_DIR, exist_ok=True)
    exhibits_csv = os.path.join(DATA_DIR, 'exhibits.csv')
    metadata_json = os.path.join(DATA_DIR, 'metadata.json')

    rows = []
    meta = []
    for i in range(1, n+1):
        cat = random.choice(CATEGORIES)
        name = f"Exhibit {i} - {cat.replace('-', ' ').title()}"
        desc = f"An engaging exhibit about {cat} featuring interactive elements and learning content."
        avg_time = random.choice([5,10,15])
        rating = round(random.uniform(3.5, 5.0), 1)
        rows.append({
            'id': f'E{i:03d}',
            'name': name,
            'category': cat,
            'description': desc,
            'averageTime': avg_time,
            'rating': rating
        })
        meta.append({
            'id': f'E{i:03d}',
            'tags': random.sample(TAGS[cat], k=min(3, len(TAGS[cat]))),
            'location': {
                'floor': random.choice(['outside','ground','first']),
                'x': random.randint(5,95),
                'y': random.randint(5,95)
            }
        })

    with open(exhibits_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['id','name','category','description','averageTime','rating'])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    with open(metadata_json, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
    print(f'Wrote {exhibits_csv} and {metadata_json}')

if __name__ == '__main__':
    main()


