import fetch from 'node-fetch';

const BASE = process.env.GEMMA_URL || 'http://127.0.0.1:8011';

export interface GemmaHealth {
  status: string;
  indexed: boolean;
}

export interface GemmaRecItem {
  id: string | number;
  score: number;
}

export async function gemmaHealth(): Promise<GemmaHealth | null> {
  try {
    const r = await fetch(`${BASE}/health`);
    if (!r.ok) return null;
    return (await r.json()) as GemmaHealth;
  } catch {
    return null;
  }
}

export async function gemmaRecommend(query: string, limit = 50): Promise<GemmaRecItem[]> {
  try {
    const r = await fetch(`${BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit })
    });
    if (!r.ok) return [];
    const data: unknown = await r.json();
    const exhibits = (data as { exhibits?: unknown })?.exhibits;
    const items = Array.isArray(exhibits) ? (exhibits as GemmaRecItem[]) : [];
    return items;
  } catch {
    return [];
  }
}

export function buildGemmaQuery(profile: any, selectedFloor?: string): string {
  const parts: string[] = [];
  const age = String(profile?.ageBand || '').toLowerCase();
  const group = String(profile?.groupType || '').toLowerCase();
  const interests: string[] = Array.isArray(profile?.interests) ? profile.interests : [];
  const time = profile?.timeBudget ? String(profile.timeBudget) : '';
  const interactivity = String(profile?.interactivity || '').toLowerCase();
  const accessibility = String(profile?.accessibility || '').toLowerCase();
  const noise = String(profile?.noiseTolerance || '').toLowerCase();
  if (age) parts.push(`age:${age}`);
  if (group) parts.push(`group:${group}`);
  if (interests.length) parts.push(`interests:${interests.join(' ')}`);
  if (time) parts.push(`time:${time}`);
  if (selectedFloor) parts.push(`floor:${selectedFloor}`);
  if (interactivity) parts.push(`interactivity:${interactivity}`);
  if (accessibility) parts.push(`access:${accessibility}`);
  if (noise) parts.push(`noise:${noise}`);
  return parts.join(', ');
}



