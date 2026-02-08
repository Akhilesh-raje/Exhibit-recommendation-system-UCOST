import fs from 'fs';
import path from 'path';
import { parse as parseSync } from 'csv-parse/sync';
import { TOPIC_SYNONYMS } from './nlp.js';
import type { Exhibit } from './answer.js';
import { CONFIG } from './config.js';

let exhibitsData: Exhibit[] = [];

const REQUIRED_HEADERS = ['id', 'name'];

type ValidationIssue = {
  row: number;
  message: string;
};

function validateRecord(record: any, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const header of REQUIRED_HEADERS) {
    if (!record[header] || String(record[header]).trim().length === 0) {
      issues.push({ row: index + 2, message: `Missing required field "${header}"` }); // +2 accounts for header + zero index
    }
  }
  if (record.features && typeof record.features === 'string') {
    try {
      const parsed = JSON.parse(record.features);
      if (!Array.isArray(parsed)) {
        issues.push({ row: index + 2, message: 'features column must be a JSON array' });
      }
    } catch {
      issues.push({ row: index + 2, message: 'features column is not valid JSON' });
    }
  }
  return issues;
}

export function getExhibits(): Exhibit[] {
  return exhibitsData;
}

export function setExhibits(data: Exhibit[]) {
  exhibitsData = data || [];
}

export function loadExhibitsFromCSV(cwd: string, dirname: string): Exhibit[] {
  try {
    const possiblePaths = [
      process.env.CSV_PATH, // Priority 1: Environment variable
      path.join(cwd, 'docs', 'exhibits.csv'),
      path.join(cwd, '..', 'docs', 'exhibits.csv'),
      path.join(cwd, 'data', 'exhibits.csv'), // Packaging path
      path.join(cwd, '..', 'data', 'exhibits.csv'), // alternate packaging path
      path.join(dirname, '..', '..', 'docs', 'exhibits.csv'),
      path.join(dirname, '..', '..', 'data', 'exhibits.csv')
    ].filter((p): p is string => !!p);
    for (const csvPath of possiblePaths) {
      const exists = fs.existsSync(csvPath);
      console.log(`[Chatbot] Checking CSV path: ${csvPath} - Exists: ${exists}`);
      if (exists) {
        console.log(`[Chatbot] Found CSV at: ${csvPath}. Loading...`);
        const { exhibits, issues } = loadCSVFile(csvPath);
        // Validate basic schema and normalize
        const normalized = exhibits
          .filter((r): boolean => {
            return !!r && typeof r === 'object' && r !== null;
          })
          .map((r: any): (Exhibit & { aliases?: string[] }) | null => {
            const id = String(r.id || '').trim();
            const name = String(r.name || '').trim();
            if (!id || !name) return null;
            let aliases: string[] = [];
            const aliasesValue: unknown = r.aliases;
            if (Array.isArray(aliasesValue)) {
              aliases = aliasesValue.map(a => String(a)).filter(Boolean);
            } else if (typeof aliasesValue === 'string' && aliasesValue.trim()) {
              aliases = aliasesValue.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            return {
              ...r,
              id,
              name,
              aliases,
              category: r.category ? String(r.category).trim() : '',
              description: r.description ? String(r.description).trim() : '',
            } as Exhibit & { aliases?: string[] };
          })
          .filter((r): r is Exhibit & { aliases?: string[] } => r !== null);

        const dropped = exhibits.length - normalized.length;
        if (dropped > 0) {
          console.warn(`[Chatbot] ⚠️  Dropped ${dropped} CSV rows missing id/name`);
        }
        if (issues.length > 0) {
          console.warn('[Chatbot] ⚠️  CSV validation warnings:');
          for (const issue of issues) {
            console.warn(`  • Row ${issue.row}: ${issue.message}`);
          }
        }
        return normalized;
      }
    }
    console.error(`[Chatbot] ❌ FAILED: CSV file not found after trying all paths:`, possiblePaths);
    return [];
  } catch (error: any) {
    console.error(`[Chatbot] ❌ Error in loadExhibitsFromCSV:`, error.message);
    return [];
  }
}

export function loadCSVFile(filePath: string): { exhibits: Exhibit[]; issues: ValidationIssue[] } {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parseSync(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true
    });
    const issues: ValidationIssue[] = [];
    const exhibits: Exhibit[] = records.map((record: any, index: number) => {
      issues.push(...validateRecord(record, index));
      let features: string[] = [];
      if (record.features) {
        try {
          features = JSON.parse(record.features);
        } catch {
          if (typeof record.features === 'string') {
            features = record.features.split(',').map((f: string) => f.trim()).filter(Boolean);
          }
        }
      }
      const aliases: string[] = typeof record.aliases === 'string'
        ? record.aliases.split(',').map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(record.aliases) ? record.aliases : [];
      return {
        id: record.id || '',
        name: record.name || '',
        description: record.description || '',
        category: record.category || '',
        // Store floor only, location formatting handled in answer generator
        floor: record.floor || undefined,
        ageRange: record.ageRange || undefined,
        exhibitType: record.type || undefined,
        environment: record.environment || undefined,
        interactiveFeatures: features.length > 0 ? features : undefined,
        // store aliases in record for matching enrichment
        ...(aliases.length ? { aliases } : {}),
      };
    });
    console.log(`[Chatbot] ✅ Loaded ${exhibits.length} exhibits from CSV file`);
    return { exhibits, issues };
  } catch (error: any) {
    console.error(`[Chatbot] Error parsing CSV file:`, error.message);
    return { exhibits: [], issues: [] };
  }
}

interface ScoredExhibit extends Exhibit { _score: number }

export function scoreTopicMatch(ex: Exhibit, topic: string): number {
  const name = (ex.name || '').toLowerCase();
  const cat = (ex.category || '').toLowerCase();
  const desc = (ex.description || '').toLowerCase();
  const synonyms = new Set([topic, ...(TOPIC_SYNONYMS[topic] || [])]);
  let s = 0;
  synonyms.forEach(syn => {
    if (syn && (name.includes(syn) || cat.includes(syn))) s += 1.5;
    if (syn && desc.includes(syn)) s += 0.75;
  });
  return s;
}

export function filterByTopicCSV(topic: string, limit: number): Exhibit[] {
  const scored: ScoredExhibit[] = exhibitsData.map(ex => ({
    ...ex,
    _score: scoreTopicMatch(ex, topic),
  }));
  const filtered = scored
    .filter(ex => ex._score >= CONFIG.topicConfidenceMin)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
  return filtered as Exhibit[];
}


