export interface GemmaRecommendation {
  id: string;
  score: number;
}

export async function recommendFromGemma(baseUrl: string, query: string, limit = 10, timeoutMs = 30000): Promise<GemmaRecommendation[]> {
  const resp = await fetch(`${baseUrl}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Gemma recommend failed ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  if (data?.error || data?.reason === 'index not built') {
    throw new Error(data?.error || data?.reason || 'Gemma index unavailable');
  }
  return Array.isArray(data?.exhibits) ? data.exhibits : [];
}

export async function fetchExhibitDetails(apiBaseUrl: string, ids: string[], timeoutMs = 10000): Promise<any[]> {
  const tasks = ids.map(async (id) => {
    const url = `${apiBaseUrl}/exhibits/${id}`;
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.exhibit || data || null;
  });
  const out = await Promise.all(tasks);
  return out.filter(Boolean);
}


