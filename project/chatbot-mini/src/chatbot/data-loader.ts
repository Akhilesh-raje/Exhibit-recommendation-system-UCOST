import fs from 'fs';
import path from 'path';
import type { Exhibit } from './answer.js';

export interface ExhibitWithMetadata extends Exhibit {
  averageTime?: number;
  rating?: number;
  coordinates?: { x: number; y: number; floor: string };
  difficulty?: string;
}

/**
 * Load exhibits from JSON file (exhibits.template.json format)
 * Supports the structured format with coordinates, ratings, etc.
 */
export function loadExhibitsFromJSON(cwd: string, dirname: string): ExhibitWithMetadata[] {
  const possiblePaths = [
    path.join(cwd, 'data', 'exhibits.template.json'),
    path.join(cwd, 'docs', 'exhibits.template.json'),
    path.join(dirname, '..', '..', 'data', 'exhibits.template.json'),
    path.join(dirname, '..', '..', 'docs', 'exhibits.template.json'),
    path.join(process.cwd(), 'data', 'exhibits.template.json'),
  ];

  for (const jsonPath of possiblePaths) {
    if (fs.existsSync(jsonPath)) {
      try {
        console.log(`[Chatbot] Loading JSON from: ${jsonPath}`);
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(raw);
        const exhibits = Array.isArray(data) ? data : (data.exhibits || []);

        const normalized: ExhibitWithMetadata[] = exhibits.map((ex: any) => {
          // Extract coordinates if available
          let coordinates: { x: number; y: number; floor: string } | undefined;
          if (ex.coordinates) {
            coordinates = {
              x: Number(ex.coordinates.x || 0),
              y: Number(ex.coordinates.y || 0),
              floor: String(ex.coordinates.floor || ex.floor || ''),
            };
          } else if (ex.floor) {
            // Fallback: use floor if coordinates not available
            coordinates = {
              x: 0,
              y: 0,
              floor: String(ex.floor),
            };
          }

          return {
            id: String(ex.id || ''),
            name: String(ex.name || ''),
            description: String(ex.description || ''),
            category: String(ex.category || ''),
            floor: coordinates?.floor || ex.floor || undefined,
            location: ex.location || coordinates?.floor ? `${coordinates?.floor} floor` : undefined,
            ageRange: ex.ageRange || undefined,
            exhibitType: ex.exhibitType || ex.type || undefined,
            environment: ex.environment || undefined,
            interactiveFeatures: Array.isArray(ex.interactiveFeatures)
              ? ex.interactiveFeatures
              : (typeof ex.interactiveFeatures === 'string' ? [ex.interactiveFeatures] : undefined),
            // Extended metadata
            averageTime: typeof ex.averageTime === 'number' ? ex.averageTime : undefined,
            rating: typeof ex.rating === 'number' ? ex.rating : undefined,
            coordinates,
            difficulty: ex.difficulty || undefined,
            aliases: Array.isArray(ex.aliases) ? ex.aliases : (typeof ex.aliases === 'string' ? ex.aliases.split(',').map((s: string) => s.trim()) : undefined),
          };
        }).filter((ex: ExhibitWithMetadata) => ex.id && ex.name);

        console.log(`[Chatbot] ✅ Loaded ${normalized.length} exhibits from JSON file`);
        return normalized;
      } catch (error: any) {
        console.warn(`[Chatbot] ⚠️  Failed to load JSON from ${jsonPath}: ${error.message}`);
      }
    }
  }

  console.warn(`[Chatbot] JSON file not found. Tried paths:`, possiblePaths);
  return [];
}

/**
 * Merge JSON and CSV data, with JSON taking precedence for metadata
 */
export function mergeExhibitData(jsonExhibits: ExhibitWithMetadata[], csvExhibits: Exhibit[]): Exhibit[] {
  const merged = new Map<string, Exhibit>();

  // First, add all CSV exhibits
  for (const ex of csvExhibits) {
    merged.set(ex.id, { ...ex });
  }

  // Then, enhance with JSON metadata where available
  for (const jsonEx of jsonExhibits) {
    const existing = merged.get(jsonEx.id);
    if (existing) {
      // Merge: keep CSV data but add JSON metadata
      merged.set(jsonEx.id, {
        ...existing,
        ...jsonEx,
        // Preserve CSV fields that might be more complete
        description: jsonEx.description || existing.description,
        category: jsonEx.category || existing.category,
      });
    } else {
      // New exhibit from JSON
      merged.set(jsonEx.id, jsonEx);
    }
  }

  return Array.from(merged.values());
}

