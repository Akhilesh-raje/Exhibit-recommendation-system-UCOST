import express from 'express';
import client from 'prom-client';
import { CONFIG } from './config.js';
import { getExhibits, setExhibits, loadExhibitsFromCSV, filterByTopicCSV } from './csv.js';
import { isGreetingOrCasual, getGreetingResponse, parseIntent, normalizeQuery, fuzzyIncludes, significantTokens, TOPIC_SYNONYMS } from './nlp.js';
import { generateAnswer, computeResponseQuality, rerankBySemantic, parseJsonField, rerankByTfidf, semanticScore, type Exhibit } from './answer.js';
import { recommendFromGemma, fetchExhibitDetails, GemmaRecommendation } from './gemma.js';
import { rerankCandidates, initializeReranker, isRerankerAvailable } from './reranker.js';

type ChatSource = { source: string; name: string | null };

type ClientExhibit = {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  floor: string | null;
  location: string | null;
  ageRange: string | null;
  exhibitType: string | null;
  environment: string | null;
  interactiveFeatures: string[];
  images: string[];
  mapLocation: Record<string, unknown> | null;
  gemmaScore: number | null;
  rerankScore: number | null;
};

interface ChatResponse {
  answer: string;
  exhibits: ClientExhibit[];
  sources: ChatSource[];
  confidence: number;
  quality: number;
  latencyMs: number;
  notice?: string;
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v)).filter(Boolean);
      }
    } catch {
      // fallthrough to split
    }
    return trimmed
      .split(/[,;|]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeMapLocation(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

interface BackendExhibit {
  id?: string | number;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  floor?: string | null;
  location?: string | null;
  ageRange?: string | null;
  exhibitType?: string | null;
  type?: string | null;
  environment?: string | null;
  interactiveFeatures?: string | string[] | null;
  images?: string | string[] | null;
  mapLocation?: Record<string, unknown> | null;
  coordinates?: Record<string, unknown> | null;
  gemmaScore?: number | null;
  gemma_score?: number | null;
  rerank_score?: number | null;
  aliases?: string[] | null;
  [key: string]: unknown;
}

function toClientExhibit(ex: BackendExhibit): ClientExhibit {
  const mapLocation = normalizeMapLocation(ex.mapLocation ?? ex.coordinates);
  const interactiveFeatures = normalizeStringArray(ex.interactiveFeatures);
  const images = normalizeStringArray(ex.images);
  const floor =
    (typeof ex.floor === 'string' && ex.floor) ||
    (typeof mapLocation?.floor === 'string' ? (mapLocation.floor as string) : null);
  return {
    id: String(ex.id || ''),
    name: ex.name ?? null,
    description: ex.description ?? null,
    category: ex.category ?? null,
    floor,
    location: ex.location ?? null,
    ageRange: ex.ageRange ?? null,
    exhibitType: ex.exhibitType ?? ex.type ?? null,
    environment: ex.environment ?? null,
    interactiveFeatures,
    images,
    mapLocation,
    gemmaScore: typeof ex.gemmaScore === 'number' ? ex.gemmaScore : typeof ex.gemma_score === 'number' ? ex.gemma_score : null,
    rerankScore: typeof ex.rerank_score === 'number' ? ex.rerank_score : null,
  };
}

export function createChatRouter(opts: {
  gemmaUrl: string;
  apiBaseUrl: string;
  cwd: string;
  dirname: string;
}) {
  const router = express.Router();

  // ---- Simple in-memory metrics ----
  // Sliding window for latencies to prevent unbounded memory growth
  const MAX_LATENCY_SAMPLES = 10000;
  const latenciesMs: number[] = [];
  const metrics = {
    requestsTotal: 0,
    chatRequests: 0,
    gemmaCalls: 0,
    backendBatchCalls: 0,
    backendItemCalls: 0,
    errors: 0,
    get latenciesMs() {
      return latenciesMs;
    },
  };

  function addLatency(duration: number): void {
    latenciesMs.push(duration);
    // Maintain sliding window - remove oldest if over limit
    if (latenciesMs.length > MAX_LATENCY_SAMPLES) {
      latenciesMs.shift();
    }
  }

  // ---- Prometheus metrics ----
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });
  const chatLatency = new client.Histogram({
    name: 'chat_latency_seconds',
    help: 'Latency of chat endpoint',
    buckets: [0.1, 0.2, 0.3, 0.5, 0.75, 1, 2, 5],
    registers: [register],
  });
  const promRequests = new client.Counter({ name: 'requests_total', help: 'Total HTTP requests', registers: [register] });
  const promChatRequests = new client.Counter({ name: 'chat_requests_total', help: 'Total chat requests', registers: [register] });
  const promGemmaCalls = new client.Counter({ name: 'gemma_calls_total', help: 'Calls to Gemma recommend', registers: [register] });
  const promBackendBatchCalls = new client.Counter({ name: 'backend_batch_calls_total', help: 'Batch calls to backend exhibits', registers: [register] });
  const promBackendItemCalls = new client.Counter({ name: 'backend_item_calls_total', help: 'Per-item calls to backend exhibits', registers: [register] });
  const promErrors = new client.Counter({ name: 'errors_total', help: 'Unhandled errors', registers: [register] });

  // ---- Exhibit details cache (True LRU with TTL) ----
  const DETAILS_TTL_MS = 2 * 60 * 1000; // 2 minutes
  const MAX_CACHE_SIZE = 100;
  // LRU cache: Map maintains insertion order, so we can use it for LRU
  const cache = new Map<string, { data: BackendExhibit, expires: number, lastAccess: number }>();

  function getCached(id: string): BackendExhibit | null {
    const entry = cache.get(id);
    if (!entry) return null;
    const now = Date.now();
    if (now > entry.expires) {
      cache.delete(id);
      return null;
    }
    // Update last access time for LRU
    entry.lastAccess = now;
    // Move to end (most recently used)
    cache.delete(id);
    cache.set(id, entry);
    return entry.data;
  }

  function setCached(id: string, data: BackendExhibit) {
    const now = Date.now();
    // Remove if already exists
    cache.delete(id);
    cache.set(id, { data, expires: now + DETAILS_TTL_MS, lastAccess: now });
    // True LRU eviction: remove least recently used (first in map)
    if (cache.size > MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
  }

  async function fetchDetailsWithCache(apiBaseUrl: string, ids: string[]): Promise<BackendExhibit[]> {
    const results: BackendExhibit[] = [];
    const missing: string[] = [];
    for (const id of ids) {
      const hit = getCached(id);
      if (hit) {
        results.push(hit as BackendExhibit);
      } else {
        missing.push(id);
      }
    }
    if (missing.length === 0) return results;

    // Try batch endpoint first: /exhibits?ids=a,b,c
    try {
      metrics.backendBatchCalls++;
      promBackendBatchCalls.inc();
      const url = `${apiBaseUrl}/exhibits?ids=${encodeURIComponent(missing.join(','))}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const data = await r.json() as { exhibits?: BackendExhibit[] } | BackendExhibit[] | null;
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.exhibits) ? data.exhibits : []);
        for (const ex of arr) {
          if (ex && typeof ex === 'object' && ex !== null) {
            const backendEx = ex as BackendExhibit;
            if (backendEx.id || backendEx.name) {
              setCached(String(backendEx.id || ''), backendEx);
              results.push(backendEx);
            }
          }
        }
        // Also fetch individually any missing that batch did not return
        const still = missing.filter(id => !results.find(x => x.id === id));
        if (still.length === 0) return results;
        for (const id of still) {
          try {
            metrics.backendItemCalls++;
            promBackendItemCalls.inc();
            const rr = await fetch(`${apiBaseUrl}/exhibits/${id}`, { signal: AbortSignal.timeout(6000) });
            if (!rr.ok) continue;
            const dj = await rr.json() as { exhibit?: BackendExhibit } | BackendExhibit;
            const ex = ('exhibit' in dj && dj.exhibit) ? dj.exhibit : dj as BackendExhibit;
            if (ex && typeof ex === 'object' && ex !== null) {
              const backendEx = ex as BackendExhibit;
              if (backendEx.id || backendEx.name) {
                setCached(String(backendEx.id || ''), backendEx);
                results.push(backendEx);
              }
            }
          } catch (error: any) {
            console.warn(`[Chatbot] ⚠️  Failed to fetch exhibit ${id} individually: ${error.message}`);
            promErrors.inc();
          }
        }
        return results;
      }
    } catch (error: any) {
      console.warn(`[Chatbot] ⚠️  Batch fetch failed, falling back to individual: ${error.message}`);
      promErrors.inc();
    }

    // Fallback: individual fetches
    for (const id of missing) {
      try {
        metrics.backendItemCalls++;
        promBackendItemCalls.inc();
        const r = await fetch(`${apiBaseUrl}/exhibits/${id}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) {
          console.warn(`[Chatbot] ⚠️  Backend returned ${r.status} for exhibit ${id}`);
          continue;
        }
        const dj = await r.json() as { exhibit?: BackendExhibit } | BackendExhibit;
        const ex = ('exhibit' in dj && dj.exhibit) ? dj.exhibit : dj as BackendExhibit;
        if (ex && typeof ex === 'object' && ex !== null) {
          const backendEx = ex as BackendExhibit;
          if (backendEx.id || backendEx.name) {
            setCached(String(backendEx.id || ''), backendEx);
            results.push(backendEx);
          }
        }
      } catch (error: any) {
        console.warn(`[Chatbot] ⚠️  Failed to fetch exhibit ${id}: ${error.message}`);
        promErrors.inc();
      }
    }
    return results;
  }

  // Load CSV on router init if not loaded
  if (getExhibits().length === 0) {
    const data = loadExhibitsFromCSV(opts.cwd, opts.dirname);
    setExhibits(data);
    if (data.length === 0) {
      console.warn(`[Chatbot] ⚠️  No exhibits loaded from CSV. Chatbot will use API/Gemma fallback.`);
    } else {
      console.log(`[Chatbot] ✅ Ready with ${data.length} exhibits from CSV`);
    }
  }

  // Initialize reranker with graceful degradation
  initializeReranker(opts.cwd, opts.dirname);

  // Warmup: prime Gemma and a small cache asynchronously
  (async () => {
    try {
      const warmQuery = 'warmup exhibits';
      const recs = await recommendFromGemma(opts.gemmaUrl, warmQuery, 5, 5000);
      if (recs && recs.length) {
        const ids = recs.slice(0, 5).map(r => r.id).filter(Boolean);
        await fetchDetailsWithCache(opts.apiBaseUrl, ids);
        console.log(`[Chatbot] ✅ Warmup completed successfully`);
      }
    } catch (error: any) {
      console.warn(`[Chatbot] ⚠️  Warmup failed (service will still work, but first request may be slower): ${error.message}`);
      promErrors.inc();
    }
  })();

  router.post('/chat', async (req, res) => {
    const startTime = Date.now();
    promRequests.inc();
    promChatRequests.inc();
    const sanitize = (text: string) => {
      if (!text) return text;
      // Keep emojis and formatting, just clean up excessive whitespace
      return text
        .replace(/\s{3,}/g, '\n\n')
        .trim();
    };
    const sanitizeInput = (text: string) => {
      if (!text) return text;
      const noHtml = String(text).replace(/<[^>]*>/g, '');
      const noUrls = noHtml.replace(/https?:\/\/\S+/g, '');
      return noUrls.trim();
    };
    const bow = (text: string): Record<string, number> => {
      const toks = (text || '').toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
      const m: Record<string, number> = {};
      for (const t of toks) m[t] = (m[t] || 0) + 1;
      return m;
    };
    const cosine = (a: Record<string, number>, b: Record<string, number>): number => {
      let dot = 0, na = 0, nb = 0;
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) {
        const av = a[k] || 0, bv = b[k] || 0;
        dot += av * bv; na += av * av; nb += bv * bv;
      }
      if (na === 0 || nb === 0) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    };
    const respond = (status: number, data: Partial<ChatResponse> & { answer: string }) => {
      const elapsed = Date.now() - startTime;
      const payload: ChatResponse = {
        answer: sanitize(data.answer),
        exhibits: data.exhibits ?? [],
        sources: data.sources ?? [],
        confidence: data.confidence ?? 0,
        quality: data.quality ?? 0,
        latencyMs: data.latencyMs ?? elapsed,
        notice: data.notice,
      };
      return res.status(status).json(payload);
    };
    try {
      metrics.requestsTotal++;
      metrics.chatRequests++;
      const { message } = req.body || {};
      if (!message || String(message).trim().length < 2) {
        return respond(400, {
          answer: '❓ **Please provide a question about exhibits, topics, locations, or features.**\n\n💡 **Examples:**\n\n✨ "Tell me about physics exhibits"\n📍 "Where is the planetarium?"\n🎮 "What interactive features are available?"',
          sources: [],
          confidence: 0,
          quality: 0,
        });
      }
      const rawMessage = String(message);
      if (rawMessage.length > 1000) {
        return respond(413, {
          answer: '📏 **Your message is too long.**\n\n✂️ Please shorten it and try again.\n\n💡 Try asking one question at a time!',
          sources: [],
          confidence: 0,
          quality: 0,
          notice: 'payload_too_large',
        });
      }
      const question = sanitizeInput(rawMessage.trim());

      if (isGreetingOrCasual(question)) {
        const greetingResponse = getGreetingResponse(question);
        return respond(200, {
          answer: greetingResponse,
          sources: [],
          confidence: 1,
          quality: 1,
        });
      }

      const parsed = parseIntent(question);

      // CSV exact-name fast path - check before clarification to handle direct matches
      let enhancedQuery = question;
      const { normalized: questionNormalized, tokens: normTokens } = normalizeQuery(question);
      const questionLower = questionNormalized;

      const exhibitsData = getExhibits();
      let directMatch: (typeof exhibitsData[0] & { aliases?: string[] }) | null = null;
      let directMatchId: string = '';
      const keywords = significantTokens(normTokens);

      // First, try exact name matching with fuzzy support for person names
      for (const ex of exhibitsData) {
        const name = (ex.name || '').toLowerCase();
        const nameNorm = normalizeQuery(name).normalized;
        const exWithAliases = ex as typeof ex & { aliases?: string[] };
        const aliasText = Array.isArray(exWithAliases.aliases) ? exWithAliases.aliases.join(' ') : '';
        const aliasNorms = aliasText
          ? aliasText
            .toLowerCase()
            .split(/[^a-z0-9]+/i)
            .filter(Boolean)
            .map((alias: string) => normalizeQuery(alias).normalized)
          : [];
        const aliasHit = aliasNorms.some((alias: string) => alias && (questionLower === alias || keywords.includes(alias)));

        // Exact match
        if (nameNorm && (questionLower === nameNorm || keywords.includes(nameNorm) || aliasHit)) {
          directMatch = exWithAliases;
          directMatchId = ex.id;
          break;
        }

        // Fuzzy match for person names (CV Raman, Satyendra Nath Bose, etc.)
        const personNamePatterns = [
          /cv\s*raman|c\s*v\s*raman|raman/i,
          /satyendra\s*nath\s*bose|satyandra\s*nath\s*bose|s\s*n\s*bose|bose\s*einstein/i,
        ];
        for (const pattern of personNamePatterns) {
          if (pattern.test(questionLower) && pattern.test(name)) {
            directMatch = exWithAliases;
            directMatchId = ex.id;
            break;
          }
        }
        if (directMatch) break;

        // Fuzzy matching for typos (himaliyan -> himalayan, etc.)
        if (fuzzyIncludes(questionLower, nameNorm, 2) || fuzzyIncludes(nameNorm, questionLower, 2)) {
          directMatch = exWithAliases;
          directMatchId = ex.id;
          break;
        }
      }
      if (directMatch) {
        // Filter out debug exhibits
        const isDebugExhibit = (ex: typeof exhibitsData[0]): boolean => {
          const name = (ex.name || '').toLowerCase();
          const desc = (ex.description || '').toLowerCase();
          return name.includes('debug') ||
            name.includes('test') ||
            desc.includes('test_exhibits') ||
            desc.includes('inserted via test');
        };
        const list = [directMatch, ...exhibitsData.filter(e => e.id !== directMatch.id && !isDebugExhibit(e))].slice(0, 5);
        const answer = generateAnswer(question, list);
        const quality = computeResponseQuality(list, parsed);
        return respond(200, {
          answer,
          exhibits: list.map((ex): ClientExhibit => toClientExhibit(ex as BackendExhibit)),
          sources: list.map(ex => ({ source: ex.id, name: ex.name })),
          confidence: Math.max(0.9, quality),
          quality: Math.max(0.8, quality),
        });
      }

      // Floor-based filtering (e.g., "ground floor exhibits", "first floor")
      const floorPatterns: Array<{ match: RegExp; floor: string }> = [
        { match: /\b(ground\s*floor|groundfloor|ground|main\s*floor|downstairs)\b/, floor: 'ground' },
        { match: /\b(first\s*floor|1st\s*floor|upstairs)\b/, floor: 'first' },
        { match: /\b(second\s*floor|2nd\s*floor)\b/, floor: 'second' },
        { match: /\b(third\s*floor|3rd\s*floor)\b/, floor: 'third' },
        { match: /\b(basement|lower\s*level)\b/, floor: 'basement' },
      ];

      let requestedFloor: string | null = null;
      for (const pattern of floorPatterns) {
        if (pattern.match.test(questionLower)) {
          requestedFloor = pattern.floor;
          break;
        }
      }

      if (requestedFloor) {
        const floorMatches = exhibitsData.filter((ex) => {
          const floorValue =
            (ex.floor || (ex.coordinates && typeof ex.coordinates === 'object' ? (ex.coordinates as any).floor : undefined) || '')
              .toString()
              .toLowerCase();
          return floorValue.includes(requestedFloor as string);
        });

        if (floorMatches.length > 0) {
          const desiredCount = parsed.count || CONFIG.maxListItemsDefault;
          const limited = floorMatches.slice(0, Math.max(desiredCount, 3));
          const answer = generateAnswer(question, limited);
          const quality = computeResponseQuality(limited, parsed);
          const backendFloorMatches: BackendExhibit[] = limited.map((ex) => ({ ...ex })) as BackendExhibit[];
          return respond(200, {
            answer,
            exhibits: backendFloorMatches.map(toClientExhibit),
            sources: limited.map((ex) => ({ source: ex.id, name: ex.name ?? null })),
            confidence: Math.max(0.75, quality),
            quality,
            notice: 'floor_filter',
          });
        }
      }

      // Enhanced query expansion for better topic matching
      if (/taramandal|planetarium|star show|night sky|constellation/i.test(questionLower)) {
        enhancedQuery = `${question} planetarium taramandal stars space astronomy`;
      } else if (/nasa|space|astronomy|stars|planets|galaxy|universe|solar system|astronaut|satellite|isro|rocket|mars|moon/i.test(questionLower)) {
        enhancedQuery = `${question} nasa space astronomy stars planets taramandal planetarium satellite astronaut isro rocket mars moon cosmos`;
      } else if (/himalaya|himalayan|himalayas|mountain|geology|earth science|geography|landform/i.test(questionLower)) {
        enhancedQuery = `${question} himalayan mountains himalayas geology geography earth science landform terrain ecosystem`;
      } else if (/chemistry|chemical|molecule|compound|reaction|element|periodic|drug|pharmaceutical/i.test(questionLower)) {
        enhancedQuery = `${question} chemistry chemical materials molecule compound reaction element periodic drug pharmaceutical`;
      } else if (/physics|mechanics|motion|force|energy|optics|light|sound/i.test(questionLower)) {
        enhancedQuery = `${question} physics mechanics motion force energy`;
      } else if (/biology|life|animals|plants|nature|genetics|dna/i.test(questionLower)) {
        enhancedQuery = `${question} biology life science nature genetics`;
      } else if (/nano|nanotech|nanotechnology|nanomaterials/i.test(questionLower)) {
        enhancedQuery = `${question} nanotechnology nanomaterials nanoscience nano`;
      } else if (/cv raman|raman|c v raman|sir cv raman/i.test(questionLower)) {
        enhancedQuery = `${question} CV Raman C V Raman scientist physicist optics light`;
      } else if (/satyendra nath bose|satyandra nath bose|s n bose|bose einstein/i.test(questionLower)) {
        enhancedQuery = `${question} Satyendra Nath Bose S N Bose physicist quantum`;
      }

      // Gemma recommend with graceful degradation
      let recs: GemmaRecommendation[] = [];
      let gemmaFailed = false;
      try {
        metrics.gemmaCalls++;
        promGemmaCalls.inc();
        recs = await recommendFromGemma(opts.gemmaUrl, enhancedQuery, 10, 30000);
      } catch (e: any) {
        console.warn(`[Chatbot] ⚠️  Gemma service unavailable: ${e.message}`);
        gemmaFailed = true;
        promErrors.inc();
      }

      // Try CSV-only fallback if Gemma failed or if configured
      if (gemmaFailed || CONFIG.csvFirst) {
        const csvTopic = parsed.topic || '';
        const csvCount = parsed.count || (parsed.intent === 'list' || /some|related to/i.test(questionLower) ? 5 : CONFIG.maxListItemsDefault);
        const csvMatches = filterByTopicCSV(csvTopic, csvCount);
        if (csvMatches.length > 0) {
          const ans = generateAnswer(question, csvMatches);
          const quality = computeResponseQuality(csvMatches, parsed);
          return respond(200, {
            answer: ans,
            exhibits: csvMatches.map((ex): ClientExhibit => toClientExhibit(ex as BackendExhibit)),
            sources: csvMatches.map(ex => ({ source: ex.id, name: ex.name ?? null })),
            confidence: Math.max(0.7, quality),
            quality,
            notice: gemmaFailed ? 'degraded_csv_only' : undefined,
          });
        }
      }

      // If Gemma failed and no CSV fallback, return error
      if (gemmaFailed) {
        return respond(503, {
          answer: '⚠️ **The AI service is unavailable right now.**\n\n🔄 Please try again shortly.\n\n💡 In the meantime, you can ask about specific exhibit names!',
          sources: [],
          confidence: 0,
          quality: 0,
          notice: 'gemma_unavailable',
        });
      }
      const filtered = recs.filter(r => r.score >= 0.3);
      if (filtered.length === 0) {
        // Try CSV fallback before giving up
        const csvTopic = parsed.topic || '';
        const csvCount = parsed.count || 5;
        const csvMatches = filterByTopicCSV(csvTopic, csvCount);
        // Filter out debug exhibits
        const isDebugExhibit = (ex: typeof csvMatches[0]): boolean => {
          const name = (ex.name || '').toLowerCase();
          const desc = (ex.description || '').toLowerCase();
          return name.includes('debug') ||
            name.includes('test') ||
            desc.includes('test_exhibits') ||
            desc.includes('inserted via test');
        };
        const filteredMatches = csvMatches.filter(ex => !isDebugExhibit(ex));
        if (filteredMatches.length > 0) {
          const ans = generateAnswer(question, filteredMatches);
          const quality = computeResponseQuality(filteredMatches, parsed);
          return respond(200, {
            answer: ans,
            exhibits: filteredMatches.map((ex): ClientExhibit => toClientExhibit(ex as BackendExhibit)),
            sources: filteredMatches.map(ex => ({ source: ex.id, name: ex.name ?? null })),
            confidence: Math.max(0.6, quality),
            quality,
            notice: 'csv_fallback',
          });
        }
        // No matches at all - provide helpful fallback message
        const topicHint = parsed.topic
          ? `🔍 **I couldn't find exhibits specifically about "${parsed.topic}", but you might try:**`
          : "🔍 **I couldn't find specific information about that topic. Try asking about:**";
        return respond(200, {
          answer: `${topicHint}\n\n🔬 Physics and optics (e.g., "CV Raman")\n🧬 Biology and genetics (e.g., "DNA", "evolution")\n🚀 Space and astronomy (e.g., "NASA", "planets")\n🤖 Technology and AI (e.g., "robotics", "artificial intelligence")\n⚗️ Chemistry and materials\n🌍 Geography and earth science\n\n💡 **Or ask about a specific exhibit by name!**`,
          sources: [],
          confidence: 0.2,
          quality: 0,
          notice: 'no_matches',
        });
      }
      const ids = filtered.slice(0, 10).map(r => r.id);
      // Use cached/batch details fetch
      const details = await fetchDetailsWithCache(opts.apiBaseUrl, ids);
      let exhibitDetails: BackendExhibit[] = details
        .filter((ex): ex is BackendExhibit => Boolean(ex))
        .map((ex) => ({
          ...ex,
          interactiveFeatures: parseJsonField(ex.interactiveFeatures),
          images: parseJsonField(ex.images),
          coordinates: parseJsonField(ex.coordinates),
          gemmaScore: filtered.find(f => f.id === String(ex.id || ''))?.score || 0,
        }))
        .sort((a, b) => (b.gemmaScore || 0) - (a.gemmaScore || 0));

      if (exhibitDetails.length === 0) {
        return respond(200, {
          answer: "⚠️ **I found candidates but couldn't load details from the backend API.**\n\n🔧 Please ensure the backend is running.\n\n💡 You can still ask about exhibits by name or topic!",
          sources: [],
          confidence: 0.3,
          quality: 0,
          notice: 'backend_unreachable',
        });
      }

      // Filter out debug/test exhibits
      const isDebugExhibit = (ex: BackendExhibit): boolean => {
        const name = (ex.name || '').toLowerCase();
        const desc = (ex.description || '').toLowerCase();
        return name.includes('debug') ||
          name.includes('test') ||
          desc.includes('test_exhibits') ||
          desc.includes('inserted via test');
      };

      // Topic/count enforcement and related backfill
      let finalExhibits: BackendExhibit[] = exhibitDetails.filter(ex => !isDebugExhibit(ex));
      const desiredCount = parsed.count || CONFIG.maxListItemsDefault;

      // Enhanced topic filtering with better matching
      if (parsed.topic) {
        const topicKey: string = parsed.topic as string;
        const topicSynonyms = TOPIC_SYNONYMS[topicKey] || [];
        const allTopicTerms = [topicKey, ...topicSynonyms];

        // Strict match: category must match
        const strict = finalExhibits.filter(ex => {
          const cat = (ex.category || '').toLowerCase();
          return allTopicTerms.some(term => cat.includes(term));
        });

        if (strict.length >= 1) {
          finalExhibits = strict.slice(0, desiredCount);
        } else {
          // Loose match: name or description contains topic
          const loose = finalExhibits.filter(ex => {
            const name = (ex.name || '').toLowerCase();
            const desc = (ex.description || '').toLowerCase();
            const fullText = `${name} ${desc}`;
            return allTopicTerms.some(term =>
              name.includes(term) || desc.includes(term) || fuzzyIncludes(fullText, term, 2)
            );
          });
          finalExhibits = (loose.length > 0 ? loose : finalExhibits).slice(0, desiredCount);
        }
      } else if (parsed.intent === 'list' || /some|related to|exhibits related/i.test(questionLower)) {
        // For "some" queries, return more results
        finalExhibits = finalExhibits.slice(0, Math.max(desiredCount, 5));
      }

      // Build features and apply trained reranker (with graceful fallback)
      const qBow = bow(question);
      const top1 = filtered[0]?.score ?? 0;
      const top2 = filtered[1]?.score ?? 0;
      const top1Delta = Math.max(0, top1 - top2);
      const featured: Array<BackendExhibit & { gemma_score: number; tfidf_cosine: number; jaccard_overlap: number; csv_exact_flag: number; description_length: number; top1_delta: number }> = finalExhibits.map(ex => {
        const text = `${ex.name || ''} ${ex.description || ''} ${ex.category || ''}`;
        const tfidfCosine = cosine(qBow, bow(text));
        const exWithName: Exhibit = {
          id: String(ex.id || ''),
          name: ex.name || '',
          description: ex.description || undefined,
          category: ex.category || undefined,
        };
        const jacc = semanticScore(question, exWithName);
        const csvExact = (directMatch && String(ex.id || '') === directMatchId) ? 1 : 0;
        const descLen = (ex.description || '').length || 0;
        return {
          ...ex,
          id: String(ex.id || ''),
          gemma_score: Number(ex.gemmaScore || ex.gemma_score || 0),
          tfidf_cosine: tfidfCosine,
          jaccard_overlap: jacc,
          csv_exact_flag: csvExact,
          description_length: descLen,
          top1_delta: top1Delta,
        };
      });
      let reranked: Array<BackendExhibit & { rerank_score: number; gemma_score: number; id: string }>;
      try {
        const rerankedWithScores = rerankCandidates(featured.map(f => ({
          id: String(f.id || ''),
          gemma_score: f.gemma_score,
          tfidf_cosine: f.tfidf_cosine,
          jaccard_overlap: f.jaccard_overlap,
          csv_exact_flag: f.csv_exact_flag,
          description_length: f.description_length,
          top1_delta: f.top1_delta,
        })));
        reranked = featured.map((f, idx) => ({
          ...f,
          id: String(f.id || ''),
          rerank_score: rerankedWithScores[idx]?.rerank_score || f.gemma_score,
        })) as Array<BackendExhibit & { rerank_score: number; gemma_score: number; id: string }>;
      } catch (error: unknown) {
        // Fallback to Gemma-only ranking if reranker fails
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[Chatbot] ⚠️  Reranker failed, using Gemma-only ranking: ${errorMessage}`);
        reranked = featured.map(f => ({
          ...f,
          id: String(f.id || ''),
          rerank_score: f.gemma_score,
        })).sort((a, b) => (b.gemma_score || 0) - (a.gemma_score || 0)) as Array<BackendExhibit & { rerank_score: number; gemma_score: number; id: string }>;
      }
      finalExhibits = reranked;

      const singleMax = parsed.brevity ? 180 : CONFIG.singleSummaryMaxChars;
      const listMax = parsed.brevity ? 90 : CONFIG.listSummaryMaxChars;
      // Convert BackendExhibit to Exhibit for answer generation
      const exhibitsForAnswer: Exhibit[] = finalExhibits.map(ex => ({
        id: String(ex.id || ''),
        name: ex.name || '',
        description: ex.description || undefined,
        category: ex.category || undefined,
        floor: ex.floor || undefined,
        location: ex.location || undefined,
        ageRange: ex.ageRange || undefined,
        exhibitType: ex.exhibitType || ex.type || undefined,
        environment: ex.environment || undefined,
        interactiveFeatures: Array.isArray(ex.interactiveFeatures) ? ex.interactiveFeatures : (typeof ex.interactiveFeatures === 'string' ? ex.interactiveFeatures : undefined),
        images: Array.isArray(ex.images) ? ex.images : (typeof ex.images === 'string' ? ex.images : undefined),
        coordinates: ex.coordinates || ex.mapLocation || undefined,
      }));
      let answer = generateAnswer(question, exhibitsForAnswer, {
        singleSummaryMaxChars: singleMax,
        listSummaryMaxChars: listMax,
      });
      answer = sanitize(answer);
      const quality = computeResponseQuality(exhibitsForAnswer, parsed);
      const topGemma = Number(finalExhibits[0]?.gemma_score || 0.6);
      const rerankScore = Number(finalExhibits[0]?.rerank_score || 0.6);
      const confidence = Math.max(0, Math.min(1, CONFIG.confidenceWeights.gemma * topGemma + CONFIG.confidenceWeights.rerank * rerankScore + CONFIG.confidenceWeights.quality * quality));
      const sources: ChatSource[] = finalExhibits.slice(0, 5).map(ex => ({
        source: String(ex.id || ''),
        name: ex.name ?? null
      }));

      const duration = Date.now() - startTime;
      addLatency(duration);
      chatLatency.observe(duration / 1000);
      console.log(`[Chatbot] Generated answer; quality=${quality.toFixed(2)}, conf=${confidence.toFixed(2)}, ms=${duration}`);
      return respond(200, {
        answer,
        exhibits: finalExhibits.map((ex): ClientExhibit => toClientExhibit(ex)),
        sources,
        confidence: Math.max(confidence, quality),
        quality,
        latencyMs: duration,
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('[Chatbot] Unexpected error:', errorMessage);
      metrics.errors++;
      promErrors.inc();
      return respond(500, {
        answer: '😔 **Oops! Something went wrong.**\n\n🔄 Please try again in a moment.\n\n💡 If the problem persists, try rephrasing your question!',
        sources: [],
        confidence: 0,
        quality: 0,
      });
    }
  });

  router.get('/prom-metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      return res.send(await register.metrics());
    } catch (e: any) {
      return res.status(500).send(e?.message || 'metrics error');
    }
  });

  router.get('/metrics', (req, res) => {
    const sorted = [...metrics.latenciesMs].sort((a, b) => a - b);
    const p = (q: number) => {
      if (!sorted.length) return null;
      const idx = Math.floor((q / 100) * (sorted.length - 1));
      return sorted[idx];
    };
    return res.json({
      requestsTotal: metrics.requestsTotal,
      chatRequests: metrics.chatRequests,
      gemmaCalls: metrics.gemmaCalls,
      backendBatchCalls: metrics.backendBatchCalls,
      backendItemCalls: metrics.backendItemCalls,
      errors: metrics.errors,
      latencyMs: {
        p50: p(50),
        p95: p(95),
        p99: p(99),
        count: metrics.latenciesMs.length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // CSV reload synchronization: use a simple mutex to prevent concurrent reloads
  let csvReloadInProgress = false;
  router.post('/reload-csv', async (req, res) => {
    if (csvReloadInProgress) {
      return res.status(429).json({ status: 'busy', message: 'CSV reload already in progress. Please wait.' });
    }
    csvReloadInProgress = true;
    try {
      const data = loadExhibitsFromCSV(opts.cwd, opts.dirname);
      // Atomic swap: set all at once
      setExhibits(data);
      if (data.length === 0) {
        return res.json({ status: 'warning', message: 'No exhibits loaded from CSV', count: 0 });
      }
      return res.json({ status: 'success', message: `Loaded ${data.length} exhibits from CSV`, count: data.length });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Chatbot] CSV reload error: ${errorMessage}`);
      return res.status(500).json({ status: 'error', error: errorMessage });
    } finally {
      csvReloadInProgress = false;
    }
  });

  router.get('/health', async (req, res) => {
    try {
      let gemmaStatus = 'offline';
      try {
        const r = await fetch(`${opts.gemmaUrl}/health`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const d = await r.json() as { indexed?: boolean } | null;
          // More resilient: check for any valid JSON response
          gemmaStatus = (d && typeof d === 'object' && (d.indexed === true || d.indexed === false)) ? 'online' : 'offline';
        }
      } catch {
        gemmaStatus = 'offline';
      }
      let apiStatus = 'offline';
      try {
        const apiHealth = await fetch(`${opts.apiBaseUrl}/exhibits?limit=1`, { signal: AbortSignal.timeout(5000) });
        apiStatus = apiHealth.ok ? 'online' : 'offline';
      } catch {
        apiStatus = 'offline';
      }
      const csvCount = getExhibits().length;
      const rerankerAvailable = isRerankerAvailable();
      return res.json({
        status: 'ok',
        gemma: gemmaStatus,
        api: apiStatus,
        csv: csvCount > 0 ? 'loaded' : 'not loaded',
        reranker: rerankerAvailable ? 'available' : 'unavailable',
        exhibitsCount: csvCount,
        timestamp: new Date().toISOString()
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return res.status(500).json({ status: 'error', error: errorMessage || 'health failed' });
    }
  });

  return router;
}


