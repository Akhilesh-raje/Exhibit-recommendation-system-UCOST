import { cosineSimilarity, topK } from '../embeddings/similarity';
import { recommenderConfig } from './config';

export type Profile = {
  ageBand?: string;
  groupType?: string;
  groupSize?: number;
  interests?: string[];
  timeBudget: number;
  mobility?: string;
  crowdTolerance?: string;
};

export type ExhibitEmbedding = {
  id: string;
  vector: number[];
  category?: string;
  averageTime: number;
  coordinates: { x: number; y: number; floor: 'outside'|'ground'|'first' };
  rating?: number;
  ageRange?: string;
  exhibitType?: string;
  difficulty?: string;
  interactiveFeatures?: string[];
  name?: string;
  description?: string;
};

export type Recommendation = {
  id: string;
  score: number;
  reasons: string[];
};

export function recommend(profile: Profile, userVector: Float32Array, exhibits: ExhibitEmbedding[]) {
  const { weights } = recommenderConfig;
  const reasonsById: Record<string, string[]> = {};

  function audienceFit(e: ExhibitEmbedding): number {
    const reasons: string[] = [];
    let s = 0;
    const age = (profile.ageBand || '').toLowerCase();
    const range = (e.ageRange || 'all').toLowerCase();
    if (!age || range.includes('all') || range.includes(age)) { s += 1; reasons.push('age fit'); }
    const group = (profile.groupType || '').toLowerCase();
    if (group.includes('kids') || group.includes('famil')) {
      if ((e.exhibitType || '').includes('interactive')) { s += 1; reasons.push('interactive for families'); }
    }
    reasonsById[e.id] = reasons;
    return s / 2; // 0..1
  }

  function quality(e: ExhibitEmbedding): number {
    const r = Number(e.rating || 0);
    return Math.max(0, Math.min(1, r / 5));
  }

  function timeFit(e: ExhibitEmbedding): number {
    const t = Number(e.averageTime || 5);
    const target = Math.max(5, profile.timeBudget / Math.max(1, Number(profile.groupSize || 1)));
    return t <= target ? 1 : Math.max(0, 1 - (t - target) / target);
  }

  // Score all exhibits
  const scored = exhibits.map(e => {
    const sim = cosineSimilarity(userVector, new Float32Array(e.vector));
    const s = weights.similarity * sim
      + weights.quality * quality(e)
      + weights.timeFit * timeFit(e)
      + weights.audienceFit * audienceFit(e);
    return { id: e.id, sim, score: s, reasons: reasonsById[e.id] || [] } as Recommendation;
  }).sort((a, b) => b.score - a.score);

  // Greedy selection under budget
  const selected: Recommendation[] = [];
  let timeUsed = 0;
  for (const rec of scored) {
    const e = exhibits.find(x => x.id === rec.id)!;
    const t = Number(e.averageTime || 5);
    if (timeUsed + t <= profile.timeBudget) {
      selected.push(rec);
      timeUsed += t;
    }
  }

  return { timeUsed, selectedIds: selected.map(s => s.id), scores: scored };
}