/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';

export type Coordinates = { x: number; y: number; floor: 'outside' | 'ground' | 'first' };

export interface Exhibit {
  id: string;
  name: string;
  description: string;
  category: string;
  averageTime: number;
  rating?: number;
  coordinates: Coordinates;
  ageRange?: string;
  exhibitType?: string;
  difficulty?: string;
  interactiveFeatures?: string[];
}

const allowedFloors = new Set(['outside', 'ground', 'first']);
const allowedCategories = new Set([
  'space-and-astronomy', 'earth-science', 'physics', 'technology', 'environment',
  'biology', 'chemistry', 'robotics', 'geology', 'other'
]);

function isValidNumber(n: any): n is number { return typeof n === 'number' && Number.isFinite(n); }

export function validateExhibit(e: any, index: number): string[] {
  const errors: string[] = [];
  const id = String(e.id || '').trim();
  if (!id) errors.push('missing id');

  const name = String(e.name || '').trim();
  if (!name) errors.push('missing name');

  const description = String(e.description || '').trim();
  if (!description || description.length < 40) errors.push('description too short (<40 chars)');

  const category = String(e.category || '').trim().toLowerCase();
  if (!allowedCategories.has(category)) errors.push(`invalid category: ${category}`);

  const averageTime = Number(e.averageTime);
  if (!Number.isInteger(averageTime) || averageTime < 1 || averageTime > 60) errors.push('averageTime must be integer 1-60');

  const rating = e.rating == null ? null : Number(e.rating);
  if (rating != null && (rating < 0 || rating > 5)) errors.push('rating out of range (0-5)');

  const c = e.coordinates || {};
  const x = Number(c.x), y = Number(c.y);
  const floor = String(c.floor || '').toLowerCase();
  if (!isValidNumber(x) || x < 0 || x > 100) errors.push('coordinates.x must be 0-100');
  if (!isValidNumber(y) || y < 0 || y > 100) errors.push('coordinates.y must be 0-100');
  if (!allowedFloors.has(floor)) errors.push(`coordinates.floor invalid: ${floor}`);

  return errors.map(msg => `[${index}] ${id || name}: ${msg}`);
}

export function main() {
  const file = process.argv[2] || path.join(process.cwd(), 'data', 'exhibits.template.json');
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    console.error('Top-level JSON must be an array');
    process.exit(1);
  }

  const seen = new Set<string>();
  const allErrors: string[] = [];
  data.forEach((e, i) => {
    const errs = validateExhibit(e, i);
    const id = String(e.id || '').trim();
    if (seen.has(id)) errs.push(`[${i}] duplicate id: ${id}`);
    seen.add(id);
    allErrors.push(...errs);
  });

  if (allErrors.length) {
    console.error('\nValidation failed with errors:');
    for (const err of allErrors) console.error(' -', err);
    process.exit(2);
  }

  console.log(`Validation passed. ${data.length} exhibits validated.`);
}

// ESM-safe entry
try {
  // @ts-ignore
  if (typeof require !== 'undefined' && require.main === module) {
    main();
  }
} catch (_) {
  const invoked = (process.argv[1] || '')
    .replace(/\\/g, '/').toLowerCase()
    .endsWith('/scripts/validate_exhibits.ts');
  if (invoked) main();
}