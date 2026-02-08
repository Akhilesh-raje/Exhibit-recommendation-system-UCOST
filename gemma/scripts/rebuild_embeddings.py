#!/usr/bin/env python3
"""
Rebuild embeddings from the backend database.
This script:
1. Fetches all exhibits from the backend API
2. Creates training data
3. Builds FAISS embeddings
"""
import os
import json
import sys
import requests

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(ROOT, 'dataset')
EMB_DIR = os.path.join(ROOT, 'embeddings')
SCRIPTS_DIR = os.path.join(ROOT, 'scripts')

# Backend API URL
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000/api')

def fetch_exhibits_from_backend():
    """Fetch all exhibits from the backend API"""
    print(f"Fetching exhibits from {BACKEND_URL}/exhibits...")
    try:
        response = requests.get(f"{BACKEND_URL}/exhibits", timeout=30)
        if response.ok:
            data = response.json()
            # Backend returns: { success: true, exhibits: [...] }
            exhibits = data.get('exhibits', []) or data.get('data', []) or []
            if not exhibits and data.get('success'):
                print("⚠️  Backend returned success but no exhibits found")
                print("   Make sure you have uploaded exhibits via the admin panel")
            else:
                print(f"✅ Fetched {len(exhibits)} exhibits from backend")
                if len(exhibits) > 0:
                    print(f"   First exhibit: {exhibits[0].get('name', 'Unknown')} (ID: {exhibits[0].get('id', 'N/A')[:10]}...)")
            return exhibits
        else:
            error_text = response.text[:200]
            print(f"❌ Failed to fetch exhibits: {response.status_code}")
            print(f"   Response: {error_text}")
            return []
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to backend at {BACKEND_URL}")
        print("   Make sure the backend is running: npm run dev:backend")
        return []
    except Exception as e:
        print(f"❌ Error fetching exhibits: {e}")
        import traceback
        traceback.print_exc()
        return []

def create_training_data(exhibits):
    """Create training data JSONL from exhibits - includes ALL uploaded information"""
    os.makedirs(DATA_DIR, exist_ok=True)
    manifest_path = os.path.join(DATA_DIR, 'training_data.jsonl')
    
    records = []
    for ex in exhibits:
        exhibit_id = ex.get('id', '')
        if not exhibit_id:
            print(f"⚠️  Skipping exhibit without ID: {ex.get('name', 'Unknown')}")
            continue
        
        # Extract ALL fields from uploaded exhibits - includes EVERYTHING you uploaded
        name = str(ex.get('name', '') or '')
        description = str(ex.get('description', '') or '')
        category = str(ex.get('category', '') or '')
        location = str(ex.get('location', '') or '')
        ageRange = str(ex.get('ageRange', '') or '')
        exhibitType = str(ex.get('exhibitType', '') or ex.get('type', '') or '')
        environment = str(ex.get('environment', '') or '')
        scientificName = str(ex.get('scientificName', '') or '')
        educationalValue = str(ex.get('educationalValue', '') or '')
        curriculumLinks = str(ex.get('curriculumLinks', '') or '')
        materials = str(ex.get('materials', '') or '')
        accessibility = str(ex.get('accessibility', '') or '')
        difficulty = str(ex.get('difficulty', '') or '')
        safetyNotes = str(ex.get('safetyNotes', '') or '')
        maintenanceNotes = str(ex.get('maintenanceNotes', '') or '')
        language = str(ex.get('language', '') or '')
        exhibitCode = str(ex.get('exhibitCode', '') or '')
        dimensions = str(ex.get('dimensions', '') or '')
        powerRequirements = str(ex.get('powerRequirements', '') or '')
        temperatureRange = str(ex.get('temperatureRange', '') or '')
        humidityRange = str(ex.get('humidityRange', '') or '')
        sponsor = str(ex.get('sponsor', '') or '')
        designer = str(ex.get('designer', '') or '')
        manufacturer = str(ex.get('manufacturer', '') or '')
        routeInstructions = str(ex.get('routeInstructions', '') or '')
        
        # Extract features/interactiveFeatures
        features = ex.get('features', []) or ex.get('interactiveFeatures', [])
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except:
                features = []
        
        # Extract nearby facilities
        nearbyFacilities = ex.get('nearbyFacilities', [])
        if isinstance(nearbyFacilities, str):
            try:
                nearbyFacilities = json.loads(nearbyFacilities)
            except:
                nearbyFacilities = []
        
        # Build comprehensive text for search - includes ALL uploaded fields
        text_parts = [
            name,
            description,
            category,
            location,
            ageRange,
            exhibitType,
            environment,
            scientificName,
            educationalValue,
            curriculumLinks,
            materials,
            accessibility,
            difficulty,
            safetyNotes,
            maintenanceNotes,
            language,
            exhibitCode,
            dimensions,
            powerRequirements,
            temperatureRange,
            humidityRange,
            sponsor,
            designer,
            manufacturer,
            routeInstructions,
        ]
        
        # Add features to search text
        if isinstance(features, list):
            text_parts.extend([str(f) for f in features if f])
        
        # Add nearby facilities to search text
        if isinstance(nearbyFacilities, list):
            text_parts.extend([str(f) for f in nearbyFacilities if f])
        
        # Combine all text for embedding - this is what makes the AI find exhibits
        text = ' '.join([str(t) for t in text_parts if t]).strip()
        
        if not text or not name:
            print(f"⚠️  Skipping exhibit {exhibit_id}: No name or text content found")
            continue
        
        # Store ALL context - this is what the chatbot will use for answers
        record = {
            'id': exhibit_id,
            'context': {
                'name': name,
                'description': description,
                'category': category,
                'location': location,
                'ageRange': ageRange,
                'exhibitType': exhibitType,
                'environment': environment,
                'educationalValue': educationalValue,
                'scientificName': scientificName,
                'difficulty': difficulty,
                'safetyNotes': safetyNotes,
                'maintenanceNotes': maintenanceNotes,
                'language': language,
                'exhibitCode': exhibitCode,
                'features': features if isinstance(features, list) else [],
                'materials': materials,
                'curriculumLinks': curriculumLinks,
                'accessibility': accessibility,
                'dimensions': dimensions,
                'powerRequirements': powerRequirements,
                'temperatureRange': temperatureRange,
                'humidityRange': humidityRange,
                'sponsor': sponsor,
                'designer': designer,
                'manufacturer': manufacturer,
                'routeInstructions': routeInstructions,
                'nearbyFacilities': nearbyFacilities if isinstance(nearbyFacilities, list) else [],
                'duration': ex.get('duration') or ex.get('averageTime') or 0,
                'floor': ex.get('mapLocation', {}).get('floor') if isinstance(ex.get('mapLocation'), dict) else (ex.get('floor') or ''),
            }
        }
        records.append(record)
    
    if len(records) == 0:
        print("❌ No valid records created. Make sure your exhibits have at least a name and description.")
        return 0
    
    with open(manifest_path, 'w', encoding='utf-8') as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    
    print(f"✅ Created training data: {len(records)} records -> {manifest_path}")
    print(f"   Sample exhibit: {records[0]['context']['name']}")
    return len(records)

def build_embeddings():
    """Run the build_embeddings.py script"""
    print("\nBuilding FAISS embeddings...")
    build_script = os.path.join(SCRIPTS_DIR, 'build_embeddings.py')
    
    # Import and run the build script
    sys.path.insert(0, SCRIPTS_DIR)
    try:
        from build_embeddings import main as build_main
        build_main()
        print("✅ Embeddings built successfully!")
        return True
    except Exception as e:
        print(f"❌ Error building embeddings: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("=" * 60)
    print("Gemma AI Embeddings Rebuild")
    print("=" * 60)
    
    # Step 1: Fetch exhibits from backend
    exhibits = fetch_exhibits_from_backend()
    if not exhibits:
        print("\n⚠️  No exhibits found. Make sure:")
        print("   1. Backend is running (npm run dev:backend)")
        print("   2. You have exhibits in your database")
        print("   3. Backend API is accessible at", BACKEND_URL)
        return False
    
    # Step 2: Create training data
    count = create_training_data(exhibits)
    if count == 0:
        print("❌ No valid training records created")
        return False
    
    # Step 3: Build embeddings
    success = build_embeddings()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ Embeddings rebuild complete!")
        print("=" * 60)
        print("\nYou can now start the Gemma AI service:")
        print("   npm run dev:gemma")
        print("\nOr start everything:")
        print("   npm run dev:all")
        return True
    else:
        print("\n❌ Failed to rebuild embeddings")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

