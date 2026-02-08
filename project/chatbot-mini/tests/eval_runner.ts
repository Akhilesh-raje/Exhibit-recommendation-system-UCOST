import fs from 'fs';
import path from 'path';

const CHAT_URL = process.env.CHAT_API || 'http://localhost:4321/chat';
const evalPath = path.join(__dirname, 'eval_set.json');

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function runOne(query: string) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
  
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const json = await res.json();
    const t1 = Date.now();
    return { json, ms: t1 - t0 };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after 60s for query: ${query}`);
    }
    throw error;
  }
}

(async () => {
  if (!fs.existsSync(evalPath)) {
    console.error('Missing tests/eval_set.json');
    process.exit(2);
  }
  const evalSet: Array<{ query: string; expected_top1_id?: string; expected_count?: number; }>
    = JSON.parse(fs.readFileSync(evalPath, 'utf8'));

  let top1Correct = 0;
  let countAdherence = 0;
  const latencies: number[] = [];

  for (const item of evalSet) {
    try {
      const { json, ms } = await runOne(item.query);
      latencies.push(ms);
      const top1 = json?.sources?.[0]?.id || json?.sources?.[0]?.source; // support {id} or {source}
      if (item.expected_top1_id && top1 === item.expected_top1_id) top1Correct++;
      if (typeof item.expected_count === 'number') {
        const returnedCount = Array.isArray(json?.sources) ? json.sources.length : 0;
        if (returnedCount >= item.expected_count) countAdherence++;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Eval] Failed for query "${item.query}": ${errorMessage}`);
      // Continue with other tests, but mark as failed
      latencies.push(60000); // Use timeout as latency for failed requests
    }
    // avoid hammering local server
    await sleep(50);
  }

  const total = evalSet.length;
  const top1Acc = total ? top1Correct / total : 0;
  const countAcc = total ? countAdherence / total : 0;
  const sorted = latencies.slice().sort((a, b) => a - b);
  const p = (q: number) => sorted[Math.floor(Math.max(0, Math.min(sorted.length - 1, (q / 100) * (sorted.length - 1))))];
  const p95 = sorted.length ? p(95) : null;

  console.log(JSON.stringify({ total, top1Acc, countAcc, p95 }, null, 2));

  const THRESH_TOP1 = Number(process.env.THRESH_TOP1 || 0.7);
  const THRESH_COUNT = Number(process.env.THRESH_COUNT || 0.7);
  const THRESH_P95_MS = Number(process.env.THRESH_P95_MS || 1200);

  if ((top1Acc < THRESH_TOP1) || (countAcc < THRESH_COUNT) || (p95 !== null && p95 > THRESH_P95_MS)) {
    console.error('EVAL FAILED');
    process.exit(2);
  }
  console.log('EVAL PASSED');
  process.exit(0);
})();
