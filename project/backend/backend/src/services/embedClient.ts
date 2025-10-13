import fetch from 'node-fetch';

const EMBED_URL = process.env.EMBED_SERVICE_URL || 'http://127.0.0.1:8001/embed';

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts })
  });
  if (!res.ok) throw new Error(`Embed service error: ${res.status} ${res.statusText}`);
  const data: unknown = await res.json();
  const vectors = (data as { vectors?: unknown })?.vectors;
  return Array.isArray(vectors) ? (vectors as number[][]) : [];
}

export async function embedQueryFromProfile(profile: any): Promise<number[] | null> {
  const parts: string[] = [];
  const age = String(profile?.ageBand || '').toLowerCase();
  const group = String(profile?.groupType || '').toLowerCase();
  const interests: string[] = Array.isArray(profile?.interests) ? profile.interests : [];
  if (age) parts.push(age);
  if (group) parts.push(group);
  if (interests.length) parts.push(interests.join(' '));
  const query = parts.join(' ').trim();
  if (!query) return null;
  const [vec] = await embedTexts([query]);
  return Array.isArray(vec) ? vec : null;
}

