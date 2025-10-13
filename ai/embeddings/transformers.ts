// Lightweight wrapper around @xenova/transformers to embed text with MiniLM
// Produces a normalized Float32Array suitable for cosine similarity.

let _embedderPromise: Promise<(text: string) => Promise<Float32Array>> | null = null;

async function loadEmbedder(): Promise<(text: string) => Promise<Float32Array>> {
  if (_embedderPromise) return _embedderPromise;

  _embedderPromise = (async () => {
    // Lazy import to avoid requiring the dependency unless used
    const { pipeline } = await import('@xenova/transformers');
    const extractor: any = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    function meanPool(tensor: any): Float32Array {
      // tensor shape: [1, seq_len, hidden]
      const data = tensor.data as Float32Array | Float64Array | number[];
      const dims = tensor.dims as number[];
      const seqLen = dims[1];
      const hidden = dims[2];
      const out = new Float32Array(hidden);
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < hidden; j++) {
          out[j] += (data[i * hidden + j] as number);
        }
      }
      for (let j = 0; j < hidden; j++) out[j] /= Math.max(1, seqLen);
      return out;
    }

    function l2Normalize(vec: Float32Array): Float32Array {
      let norm = 0;
      for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm);
      if (norm === 0) return vec;
      const out = new Float32Array(vec.length);
      for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
      return out;
    }

    return async (text: string): Promise<Float32Array> => {
      const output: any = await extractor(text, { normalize: true });
      const pooled = meanPool(output);
      return l2Normalize(pooled);
    };
  })();

  return _embedderPromise;
}

export async function embedText(text: string): Promise<Float32Array> {
  const embedder = await loadEmbedder();
  return embedder(text);
}

