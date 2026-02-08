import fs from 'fs';
import path from 'path';

export type CandidateFeatures = {
  id: string;
  gemma_score: number;
  tfidf_cosine: number;
  jaccard_overlap: number;
  csv_exact_flag: number;
  description_length: number;
  top1_delta: number;
  [key: string]: any;
};

type Model = {
  feature_cols: string[];
  scaler_mean: number[];
  scaler_scale: number[];
  coef: number[];
  intercept: number;
};

let modelCache: Model | null = null;
let modelAvailable = false;
let modelPath: string | null = null;

export function initializeReranker(cwd: string, dirname: string): void {
  // Try multiple paths for model resolution
  const possiblePaths = [
    path.join(cwd, 'models', 'reranker.json'),
    path.join(cwd, '..', 'models', 'reranker.json'),
    path.join(dirname, '..', '..', 'models', 'reranker.json'),
    process.env.RERANKER_PATH || '',
    process.env.RERANKER_MODEL_PATH || '',
  ].filter(Boolean);

  for (const candidatePath of possiblePaths) {
    if (fs.existsSync(candidatePath)) {
      try {
        const raw = fs.readFileSync(candidatePath, 'utf8');
        modelCache = JSON.parse(raw) as Model;
        modelPath = candidatePath;
        modelAvailable = true;
        console.log(`[Reranker] ✅ Model loaded from: ${candidatePath}`);
        return;
      } catch (error: any) {
        console.warn(`[Reranker] ⚠️  Failed to load model from ${candidatePath}: ${error.message}`);
      }
    }
  }

  // Model not found - graceful degradation
  modelAvailable = false;
  console.warn(`[Reranker] ⚠️  Model not found. Reranker will use Gemma-only ranking. Tried paths:`, possiblePaths);
}

function loadModel(): Model | null {
  if (modelCache) return modelCache;
  return null;
}

export function isRerankerAvailable(): boolean {
  return modelAvailable;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function scoreCandidate(candidate: CandidateFeatures): number {
  const m = loadModel();
  if (!m) {
    // Fallback: use Gemma score as rerank score when model unavailable
    return candidate.gemma_score || 0;
  }
  // Dynamic feature access: feature_cols are runtime-defined, so we need to access dynamically
  // This is safe because CandidateFeatures has [key: string]: any for dynamic features
  const features = m.feature_cols.map((col) => Number(candidate[col] ?? 0));
  const scaled = features.map((v, i) => (v - m.scaler_mean[i]) / (m.scaler_scale[i] || 1));
  let s = m.intercept;
  for (let i = 0; i < m.coef.length; i++) s += m.coef[i] * scaled[i];
  return sigmoid(s);
}

export function rerankCandidates<T extends CandidateFeatures>(candidates: T[]): (T & { rerank_score: number })[] {
  if (!modelAvailable) {
    // Fallback: sort by Gemma score when model unavailable
    return candidates
      .map((c) => ({ ...c, rerank_score: c.gemma_score || 0 }))
      .sort((a, b) => b.rerank_score - a.rerank_score);
  }
  return candidates
    .map((c) => ({ ...c, rerank_score: scoreCandidate(c) }))
    .sort((a, b) => b.rerank_score - a.rerank_score);
}
