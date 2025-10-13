export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function topK<T>(items: T[], k: number, score: (x: T) => number): T[] {
  // Simple partial sort for small k
  return items
    .map(item => ({ item, s: score(item) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(x => x.item);
}