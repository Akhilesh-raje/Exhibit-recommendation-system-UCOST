## Chatbot Mini — Engineering Postmortem-Style Critique (Updated)

_Author perspective: Principal engineer (15+ years, large-scale conversational systems) assessing production readiness after recent refactoring._

**Review Date:** November 2025  
**Codebase State:** Post-refactoring (thin bootstrap architecture)  
**Review Scope:** Production readiness assessment  
**Refactor Commit:** `[refactor-abc123]` (thin bootstrap implementation)

---

## 📊 Executive Summary (3-Line Scan)

**Summary:** Major architectural cleanup complete (✅ 11 resolved issues). However, three production-blocking issues remain (reranker hard dependency, unbounded memory growth, silent error swallowing). The system will fail catastrophically under real-world load until these are fixed.

**Status:** ⚠️ **Partially Improved, Still Production-Unsafe** — Improved architecture, but unsafe to deploy. The service will fail catastrophically under real-world conditions (missing model files, network partitions, memory pressure).

**Go/No-Go Recommendation:** 🚫 **NO-GO for production deployment** until P0 items are resolved. Estimated 4-6 hours to address critical blockers.

---

## 📈 Progress Metrics

| Category | Resolved | Remaining | Total | Progress |
|----------|----------|-----------|-------|----------|
| **Architecture** | 4 | 0 | 4 | ✅ 100% |
| **Critical Blockers** | 0 | 3 | 3 | ❌ 0% |
| **High Priority** | 0 | 3 | 3 | ❌ 0% |
| **Medium Priority** | 0 | 4 | 4 | ❌ 0% |
| **Low Priority** | 0 | 2 | 2 | ❌ 0% |
| **Data Pipeline** | 0 | 3 | 3 | ❌ 0% |
| **NLP/Intent** | 0 | 2 | 2 | ❌ 0% |
| **API/Error Handling** | 0 | 2 | 2 | ❌ 0% |
| **Security** | 3 | 4 | 7 | ⚠️ 43% |
| **Performance** | 3 | 3 | 6 | ⚠️ 50% |
| **Testing** | 0 | 4 | 4 | ❌ 0% |
| **Operations** | 0 | 4 | 4 | ❌ 0% |
| **TOTAL** | **11** | **34** | **45** | **24%** |

---

## 🏗️ System Context Snapshot

### Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │ HTTP POST /chat
       ▼
┌─────────────────────────────────────────────────┐
│         Express Server (Port 4321)              │
│  ┌──────────────────────────────────────────┐  │
│  │  Middleware: Rate Limit, Logging, CORS   │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │     Chat Router (src/chatbot/routes.ts)  │  │
│  │  • Intent Parsing (nlp.ts)               │  │
│  │  • Answer Generation (answer.ts)          │  │
│  │  • Reranker (reranker.ts) ← CRITICAL      │  │
│  └──────────────────────────────────────────┘  │
└──────┬──────────────────┬──────────────────┬───┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Gemma API   │  │ Backend API  │  │  CSV Loader  │
│ (Port 8011)  │  │ (Port 5000)  │  │  (Local)     │
│              │  │              │  │              │
│ • /recommend │  │ • /exhibits  │  │ • exhibits   │
│ • /health    │  │ • /exhibits/ │  │   .csv       │
│              │  │   :id        │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Reranker Model       │
              │  models/reranker.json │ ← CRITICAL
              │  (Local, Optional)    │
              └───────────────────────┘
```

### Dependency Table

| Component | Type | Required | Failure Mode | Fallback Available |
|-----------|------|---------|--------------|-------------------|
| **Gemma API** | External HTTP | Yes (primary) | Network timeout, 503 | ❌ No (returns error) |
| **Backend API** | External HTTP | Yes (details) | Network timeout, 404 | ⚠️ Partial (cache) |
| **CSV Loader** | Local file | No (optional) | File not found | ✅ Yes (API fallback) |
| **Reranker Model** | Local file | ❌ **Hard dependency** | File not found | ❌ **No (crashes service)** |

---

## 🚨 Operational Risk Matrix

| Risk | Likelihood | Impact | Severity | Mitigation Status | Owner |
|------|------------|--------|----------|-------------------|-------|
| **Missing reranker model** | High | Critical outage | P0 | ❌ Not implemented | Backend Team |
| **Memory growth (latencies)** | High | OOM after sustained load | P0 | ❌ Not implemented | Backend Team |
| **Silent catch blocks** | Medium | Debugging blind | P0 | ❌ Not implemented | Backend Team |
| **Gemma outage (no fallback)** | Medium | Total service failure | P1 | ❌ Not implemented | Backend Team |
| **Type safety violations** | Medium | Runtime errors in production | P1 | ❌ Not implemented | Backend Team |
| **CSV reload race condition** | Low | Partial data corruption | P2 | ❌ Not implemented | Backend Team |
| **Cache FIFO vs LRU** | Low | Suboptimal performance | P2 | ❌ Not implemented | Backend Team |
| **Warmup failures silent** | Low | Cold start latency | P3 | ❌ Not implemented | Backend Team |

**Risk Score:** 🔴 **High** (3 P0 items, 2 P1 items, multiple unmitigated risks)

---

## 🔄 Rollback & Fail-Open Posture

### Current State: **Fail-Closed** (Unacceptable)

The service currently fails completely when dependencies are unavailable:

| Scenario | Current Behavior | Desired Behavior |
|----------|------------------|------------------|
| **Reranker model missing** | ❌ Service crashes on first request | ✅ Fallback to Gemma-only ranking, log warning |
| **Gemma API down** | ❌ Returns 503 error to user | ✅ Fallback to CSV-only answers, return `degraded: true` |
| **Backend API down** | ⚠️ Partial results (cache only) | ✅ Use cached data, return `degraded: true` |
| **CSV file missing** | ⚠️ Service starts but no CSV data | ✅ Service starts, relies on API/Gemma only |

### Recommended Fail-Open Strategy

1. **Reranker Missing:**
   - Detect at startup, log warning.
   - Use Gemma score ordering as fallback.
   - Health check reports `reranker: degraded`.

2. **Gemma Unavailable:**
   - Attempt CSV-only matching first.
   - Return results with `degraded: true` flag.
   - Log fallback event for monitoring.

3. **Backend API Unavailable:**
   - Use cached exhibit details (2-min TTL).
   - Return partial results with `degraded: true`.
   - Log cache hit rate.

4. **All Dependencies Down:**
   - Return 503 with clear message.
   - Expose health endpoint showing dependency status.

---

## ✅ Verification Checklist (Post-Fix Acceptance Criteria)

| Area | Success Criteria | Test Method | Status |
|------|------------------|-------------|--------|
| **Reranker fallback** | Missing `models/reranker.json` does **not** crash service; returns Gemma-only result | Remove model file, send request, verify 200 response | ❌ Not tested |
| **Latency metrics** | Memory stable under 10k RPS soak test for 1h | Load test, monitor memory, verify no OOM | ❌ Not tested |
| **Error logging** | No empty `catch`; logs visible in stdout/Prometheus | Code review, grep for `catch {}`, verify logs | ❌ Not tested |
| **Type safety** | `tsc --noImplicitAny` passes | Run `npm run build`, verify zero errors | ❌ Not tested |
| **Graceful degradation** | When Gemma down, CSV answers served with `degraded: true` | Stop Gemma, send request, verify CSV results | ❌ Not tested |
| **Health checks** | `/health` returns `reranker:ok|degraded`, `gemma:ok|offline`, `csv:loaded|not_loaded` | Call `/health`, verify JSON structure | ❌ Not tested |
| **Evaluation runner** | CI fails on accuracy/latency regressions | Run `npm run eval:run`, verify exit codes | ❌ Not tested |
| **Cache implementation** | True LRU or clearly documented FIFO | Code review, verify eviction logic | ❌ Not tested |

---

## 📊 Scoring Summary

| Dimension | Score (0-5) | Trend | Notes |
|-----------|------------|-------|-------|
| **Architecture** | 4 → 5 | ↑ | Thin bootstrap achieved, modular routing |
| **Reliability** | 2 → 3 | ↑ | Improved but P0 blockers remain |
| **Observability** | 2 → 4 | ↑ | Prometheus metrics added |
| **Security** | 3 → 3 | — | Basic controls added, gaps remain |
| **Testing** | 1 → 1 | — | No improvement |
| **Performance** | 2 → 4 | ↑ | Caching, warmup, batch fetching |
| **Operational Readiness** | 1 → 2 | ↑ | Metrics exposed, but no runbooks |
| **Overall** | **2.1 → 3.1** | **↑** | **Improving but not production-ready** |

---

## 1. Architectural Improvements (Acknowledged)

✅ **Fixed: Dual Implementation**
- `server.ts` is now a proper thin bootstrap (78 lines vs. previous 500+).
- All logic correctly routed through `src/chatbot/routes.ts`.
- Configuration unified in `src/chatbot/config.ts` (immutable).

✅ **Fixed: Basic Security Middleware**
- Request size limits implemented (`32kb` JSON, `16kb` URL-encoded).
- Log redaction in place (messages truncated to 80 chars).
- Basic IP-based rate limiting added (40 req/min per IP).

✅ **Fixed: Observability Foundation**
- Prometheus metrics integrated (`prom-client`).
- `/prom-metrics` endpoint exposed.
- JSON `/metrics` endpoint for quick inspection.

✅ **Fixed: Performance Optimizations**
- Warmup job implemented (primes Gemma and cache).
- LRU cache for exhibit details (2-minute TTL).
- Batch fetching for exhibit details (`/exhibits?ids=...`).

---

## 2. Critical Production Blockers — Must Fix Before Launch

### 2.1. **Reranker Model Hard Dependency (CRITICAL)** [routes.ts #479]

**Location:** `src/chatbot/reranker.ts:26-34`, `src/chatbot/routes.ts:479`  
**Owner:** Backend Team  
**Estimated Fix Time:** 2 hours

**Problem:**
```typescript
function loadModel(): Model {
  if (modelCache) return modelCache;
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`Reranker model not found at ${MODEL_PATH}. Train first or provide a model.`);
  }
  // ...
}
```

The reranker is called unconditionally in the hot path (`routes.ts:479`). If `models/reranker.json` is missing:
- The service **crashes on first request** after startup.
- No graceful fallback to Gemma-only ranking.
- Deployment fails if training data isn't available.

**Impact:** Service is completely unusable without the model file. This violates the principle of graceful degradation.

**Fix Required:**
- Wrap `rerankCandidates` in try-catch.
- Fall back to Gemma score ordering if model unavailable.
- Log warning but continue serving requests.
- Add health check indicator for model availability.

**Verification:**
- [ ] Remove `models/reranker.json`, verify service starts.
- [ ] Send request, verify 200 response with Gemma-only ranking.
- [ ] Check `/health` endpoint, verify `reranker: degraded` status.
- [ ] Verify logs contain warning message.

---

### 2.2. **Silent Error Swallowing (CRITICAL)** [routes.ts #184, 188, 200, 225]

**Location:** `src/chatbot/routes.ts:184, 188, 200, 225`  
**Owner:** Backend Team  
**Estimated Fix Time:** 1.5 hours

**Problem:**
```typescript
} catch {}  // Four instances - network failures vanish into the void
```

Empty catch blocks hide:
- Backend API failures (batch and individual fetches).
- Gemma warmup failures.
- Network timeouts and connection errors.

**Impact:**
- Production issues are invisible until users complain.
- No metrics for dependency failures.
- Debugging requires packet captures or external monitoring.
- Violates observability best practices.

**Fix Required:**
- Log all caught errors with context (endpoint, IDs, retry count).
- Increment error counters for monitoring.
- Emit structured error events for alerting.
- Consider retry logic with exponential backoff.

**Verification:**
- [ ] Code review: zero empty `catch {}` blocks.
- [ ] Stop backend API, verify errors logged to stdout.
- [ ] Check Prometheus metrics, verify `errors_total` increments.
- [ ] Verify error logs include endpoint, IDs, timestamp.

---

### 2.3. **Unbounded Memory Growth (CRITICAL)** [routes.ts #107, 496]

**Location:** `src/chatbot/routes.ts:107, 496`  
**Owner:** Backend Team  
**Estimated Fix Time:** 1 hour

**Problem:**
```typescript
const metrics = {
  latenciesMs: [] as number[],  // Grows forever
  // ...
};
// Later:
metrics.latenciesMs.push(duration);  // Never cleaned up
```

The latency array accumulates every request indefinitely. Under sustained load:
- Memory usage grows linearly with request count.
- Eventually triggers OOM kills or service degradation.
- Percentile calculations (`p50`, `p95`, `p99`) become expensive on large arrays.

**Impact:** Service will crash after ~100k requests (assuming 8 bytes per number = ~800KB, but array overhead makes this worse).

**Fix Required:**
- Implement a sliding window (keep last N latencies, e.g., 10,000).
- Use a circular buffer or time-based eviction.
- Consider using `prom-client` Histogram exclusively (it handles this).
- Remove the in-memory array if Prometheus is the source of truth.

**Verification:**
- [ ] Run 10k requests, verify memory stable (no growth).
- [ ] Verify percentile calculations still accurate with sliding window.
- [ ] Check Prometheus metrics, verify histogram buckets populated.
- [ ] Load test for 1 hour, verify no OOM.

---

## 3. High Priority Issues — Should Fix Before Scale

### 3.1. **Type Safety Violations (HIGH)** [routes.ts #27+ instances]

**Location:** `src/chatbot/routes.ts` (27+ instances of `any`)  
**Owner:** Backend Team  
**Estimated Fix Time:** 4 hours

**Problem:**
```typescript
function toClientExhibit(ex: any): ClientExhibit {  // 'any' defeats type safety
  // ...
  const mapLocation = normalizeMapLocation(ex.mapLocation ?? ex.coordinates);
  // ...
}
```

TypeScript strict mode is enabled, but `any` is used liberally:
- `ex: any` in `toClientExhibit` (line 66).
- `(req as any).body?.message` (line 26).
- `(ex as any).aliases` (line 352).
- Feature computation uses `(candidate as any)[col]` (reranker.ts:42).

**Impact:**
- Runtime type errors go undetected until production.
- Refactoring is dangerous (no compiler safety net).
- IDE autocomplete and type hints fail.

**Fix Required:**
- Define proper interfaces for API responses (`BackendExhibit`, `GemmaResponse`).
- Remove all `any` types, use `unknown` with type guards if needed.
- Add runtime validation for external API responses (Zod or similar).

**Verification:**
- [ ] Run `tsc --noImplicitAny`, verify zero errors.
- [ ] Code review: zero `any` types (except legitimate cases).
- [ ] Verify IDE autocomplete works for API responses.
- [ ] Add runtime validation tests.

---

### 3.2. **No Graceful Degradation (HIGH)** [routes.ts #395-403]

**Location:** `src/chatbot/routes.ts:395-403`  
**Owner:** Backend Team  
**Estimated Fix Time:** 3 hours

**Problem:**
```typescript
} catch (e: any) {
  return respond(503, {
    answer: 'The AI service is unavailable right now. Please try again shortly.',
    // ...
  });
}
```

When Gemma fails, the service returns an error instead of falling back to CSV-only responses. The code has CSV-first logic (`CONFIG.csvFirst`), but it's not used as a fallback.

**Impact:**
- Service becomes completely unusable if Gemma is down.
- Users get error messages instead of partial results.
- No "safe mode" for degraded operations.

**Fix Required:**
- Implement CSV-only fallback when Gemma fails.
- Return partial results with a `degraded: true` flag.
- Log fallback events for monitoring.

**Verification:**
- [ ] Stop Gemma service, send request.
- [ ] Verify 200 response with CSV-only results.
- [ ] Verify response includes `degraded: true` flag.
- [ ] Check logs, verify fallback event recorded.

---

### 3.3. **Evaluation Runner Lacks Error Handling (MEDIUM→HIGH)** [eval_runner.ts #16]

**Location:** `tests/eval_runner.ts:16`  
**Owner:** QA/Backend Team  
**Estimated Fix Time:** 1 hour

**Problem:**
```typescript
const res = await fetch(CHAT_URL, { /* ... */ });
const json = await res.json();  // No check if res.ok
```

The eval runner doesn't check HTTP status codes. If the service returns 500, it still tries to parse JSON, potentially crashing the test harness.

**Impact:**
- CI evaluation can fail silently or crash unpredictably.
- False positives (tests pass when service is broken).

**Fix Required:**
- Check `res.ok` before parsing JSON.
- Handle non-200 status codes appropriately.
- Add timeout handling.
- Integrate into CI pipeline.

**Verification:**
- [ ] Send request to broken service (500), verify runner handles gracefully.
- [ ] Verify CI fails on evaluation regressions.
- [ ] Add timeout test, verify runner times out appropriately.

---

## 4. Medium Priority Issues — Quality of Life

### 4.1. **Cache Implementation is Not LRU (MEDIUM)** [routes.ts #127-142]

**Location:** `src/chatbot/routes.ts:127-142`  
**Owner:** Backend Team  
**Estimated Fix Time:** 2 hours

**Problem:**
```typescript
if (cache.size > 100) {
  const firstKey = cache.keys().next().value;  // FIFO, not LRU
  if (firstKey) cache.delete(firstKey);
}
```

The cache claims to be "LRU-ish" but uses FIFO eviction (first-in-first-out). Frequently accessed items can be evicted before rarely used ones.

**Impact:**
- Cache hit rate is suboptimal.
- Performance degrades unnecessarily.

**Fix Required:**
- Implement true LRU (track access order, evict least recently used).
- Or use a library like `lru-cache` (npm package).
- Or accept FIFO and rename to avoid confusion.

**Verification:**
- [ ] Code review: verify LRU logic or rename to FIFO.
- [ ] Load test: verify cache hit rate improves with LRU.
- [ ] Verify eviction order matches LRU semantics.

---

### 4.2. **Hardcoded Confidence Weights (MEDIUM)** [routes.ts #492]

**Location:** `src/chatbot/routes.ts:492`  
**Owner:** ML/Backend Team  
**Estimated Fix Time:** 1 hour

**Problem:**
```typescript
const confidence = Math.max(0, Math.min(1, 0.25 * topGemma + 0.6 * rerankScore + 0.15 * quality));
```

Confidence calculation uses magic numbers with no justification or tuning mechanism. These weights are:
- Not validated against labeled data.
- Not configurable.
- Not documented.

**Impact:**
- Confidence scores may be miscalibrated.
- No way to tune without code changes.
- Difficult to A/B test alternatives.

**Fix Required:**
- Move weights to `CONFIG` with documentation.
- Consider calibration against labeled data.
- Add feature flags for experimentation.

**Verification:**
- [ ] Verify weights moved to `CONFIG`.
- [ ] Verify weights documented with rationale.
- [ ] Test: change weights via config, verify confidence changes.

---

### 4.3. **Model Path Resolution (MEDIUM)** [reranker.ts #23]

**Location:** `src/chatbot/reranker.ts:23`  
**Owner:** Backend Team  
**Estimated Fix Time:** 30 minutes

**Problem:**
```typescript
const MODEL_PATH = path.join(process.cwd(), 'models', 'reranker.json');
```

Uses `process.cwd()`, which may not be the project root in all deployment scenarios (Docker, systemd, PM2 with different working directories).

**Impact:**
- Model file not found in production if CWD differs.
- Hard to debug (path resolution is implicit).

**Fix Required:**
- Use `__dirname` or `import.meta.url` for relative paths.
- Or accept `MODEL_PATH` as environment variable.
- Add path logging at startup for debugging.

**Verification:**
- [ ] Test in Docker container, verify model path resolves.
- [ ] Verify startup logs show model path.
- [ ] Test with `MODEL_PATH` env variable.

---

### 4.4. **No CSV Reload Synchronization (MEDIUM)** [routes.ts #553-564]

**Location:** `src/chatbot/routes.ts:553-564`  
**Owner:** Backend Team  
**Estimated Fix Time:** 1.5 hours

**Problem:** `/reload-csv` mutates global `exhibitsData` without locking. Concurrent requests during reload see partially mutated state.

**Impact:**
- Race condition: partial data corruption possible.
- Inconsistent responses during reload.

**Fix Required:**
- Add mutex/lock or use atomic swap pattern.
- Consider versioning or read-write locks.

**Verification:**
- [ ] Concurrent reload test: verify no data corruption.
- [ ] Verify atomic swap or mutex implemented.
- [ ] Load test during reload, verify consistent responses.

---

## 5. Low Priority Issues — Nice to Have

### 5.1. **Warmup Failures Are Silent (LOW)** [routes.ts #217-226]

**Location:** `src/chatbot/routes.ts:217-226`  
**Owner:** Backend Team  
**Estimated Fix Time:** 30 minutes

**Problem:**
```typescript
(async () => {
  try {
    // warmup logic
  } catch {}  // Silent failure
})();
```

Warmup failures are swallowed. If Gemma or backend is down at startup, the service starts but will be slow on first request.

**Impact:**
- Cold start latency on first real request.
- No visibility into warmup health.

**Fix Required:**
- Log warmup failures (warning level).
- Consider retrying warmup periodically.
- Add health check that verifies warmup success.

**Verification:**
- [ ] Stop Gemma at startup, verify warning logged.
- [ ] Verify first request after warmup failure is slower.
- [ ] Check health endpoint, verify warmup status.

---

### 5.2. **CSV Location Formatting Duplication (LOW)** [csv.ts #132, answer.ts #78-87]

**Location:** `src/chatbot/csv.ts:132`, `src/chatbot/answer.ts:78-87`  
**Owner:** Backend Team  
**Estimated Fix Time:** 30 minutes

**Problem:** CSV loader sets `location: "Floor: X"` and `floor: X`. Answer formatter then adds "floor" again, potentially creating "Floor: 1 • 1 floor".

**Fix:** Use `floor` only, format location in answer generator.

**Verification:**
- [ ] Test with floor data, verify no duplication.
- [ ] Verify location formatting consistent.

---

## 6. Data & Retrieval Pipeline Issues (Remaining)

### 6.1. **Topic Synonym Table Still Has Issues** [nlp.ts #11-20]

**Location:** `src/chatbot/nlp.ts:11-20`

**Status:** Fixed (no trailing commas found in current code). However, the synonym matching logic is still fragile (fuzzy matching with arbitrary thresholds).

---

## 7. NLP & Intent Handling (Remaining Issues)

### 7.1. **Confidence Heuristics Are Arbitrary** [nlp.ts #112]

**Location:** `src/chatbot/nlp.ts:112`

**Problem:**
```typescript
const confidence = intent === 'unknown' ? 0.3 : Math.min(1, 0.4 + signalCount * 0.2);
```

Linear keyword counting with magic numbers. No validation against labeled data.

**Fix:** Calibrate against labeled queries, or use a simple ML model.

---

### 7.2. **Greeting Detection False Positives** [nlp.ts #116-129]

**Location:** `src/chatbot/nlp.ts:116-129`

**Problem:** Queries like "Good physics exhibits?" may be misclassified as greetings if they start with "good" and are short.

**Status:** Partially mitigated by `hasTaskWords` check, but edge cases remain.

---

## 8. API Behavior & Error Handling (Remaining)

### 8.1. **Status Code Usage Improved But Inconsistent** [routes.ts]

**Status:** Better than before (400 for bad input, 503 for service unavailable), but:
- Some errors still return 200 with `notice` field.
- Clarification prompts return 200 instead of 422 (Unprocessable Entity).

**Fix:** Use 422 for clarification requests, ensure all errors use appropriate codes.

---

### 8.2. **Health Endpoint Fragility** [routes.ts #566-597]

**Location:** `src/chatbot/routes.ts:566-597`

**Problem:** Assumes Gemma returns `{ indexed: boolean }`. If schema changes, health check fails even if service works.

**Fix:** Make health check more resilient (check for any valid JSON response, or use `/recommend` with a test query).

---

## 9. Security Posture (Improved, But Gaps Remain)

✅ **Fixed:**
- Request size limits.
- Log redaction.
- Basic rate limiting.

❌ **Remaining:**
- CORS is still wide open (`cors()` with no origin filtering).
- No authentication/authorization.
- No input validation beyond length checks (no schema validation).
- Rate limiter is in-memory (doesn't work across instances).

---

## 10. Performance (Improved, But Issues Remain)

✅ **Fixed:**
- Warmup implemented.
- Caching implemented.
- Batch fetching implemented.

❌ **Remaining:**
- Unbounded `latenciesMs` array (see 2.3).
- No memoization for repeated queries.
- Verbose logging on hot path (multiple `console.log` calls per request).

---

## 11. Testing & Quality Assurance (Unchanged)

❌ **Still Missing:**
- Zero unit tests.
- Zero integration tests.
- No schema validation for API responses.
- No linting configuration (ESLint, Prettier).

**Status:** Evaluation harness exists (`eval_runner.ts`) but is not integrated into CI, and has error handling gaps (see 3.3).

---

## 12. Deployment & Operations (Unchanged)

❌ **Still Missing:**
- No Dockerfile.
- No process manager config (systemd, PM2).
- No environment variable documentation.
- No deployment runbooks.

**Status:** Metrics are exposed, but no guidance on scraping or alerting.

---

## 13. CI/CD & Observability Recommendations

### CI Pipeline Requirements

**Pre-commit Checks:**
- Run `npm test && tsc --noEmit` and `eslint .`
- Verify no empty `catch {}` blocks (grep check)
- Ensure `tsc --noImplicitAny` passes

**CI Pipeline Steps:**

```yaml
# Recommended GitHub Actions / CI steps
- name: Type Check
  run: npm run build && tsc --noEmit && tsc --noImplicitAny

- name: Lint
  run: npm run lint  # Add ESLint config

- name: Unit Tests
  run: npm test  # Add test suite

- name: Evaluation Harness
  run: npm run eval:run
  env:
    CHAT_API: http://localhost:4321/chat
    THRESH_TOP1: 0.7
    THRESH_COUNT: 0.7
    THRESH_P95_MS: 1200
```

### Health Check Requirements

**Endpoint:** `GET /health` (or `/healthz` for Kubernetes compatibility)

**Expected Response:**
```json
{
  "status": "ok|degraded|error",
  "reranker": "ok|degraded|missing",
  "gemma": "online|offline",
  "api": "online|offline",
  "csv": "loaded|not_loaded",
  "exhibitsCount": 1234,
  "timestamp": "2025-11-13T10:00:00Z"
}
```

**Health Check Gating:**
- `/healthz` returns `reranker:ok`, `gemma:ok`, `csv:ok` (or degraded status)
- Kubernetes liveness probe should check `/healthz` endpoint
- Readiness probe should verify all critical dependencies are available

### Prometheus Alerting Rules

**Alerting:** `Prometheus` alerts on error rate > 2%, memory > 80%.

```yaml
# Recommended alerts
- alert: ChatbotHighErrorRate
  expr: rate(errors_total[5m]) > 0.02  # 2% error rate threshold
  for: 5m
  annotations:
    summary: "Chatbot error rate exceeds 2%"

- alert: ChatbotHighLatency
  expr: histogram_quantile(0.95, chat_latency_seconds_bucket) > 2.0
  for: 5m
  annotations:
    summary: "Chatbot p95 latency exceeds 2 seconds"

- alert: ChatbotMemoryHigh
  expr: process_resident_memory_bytes / 1024 / 1024 > 512  # 512MB threshold
  for: 10m
  annotations:
    summary: "Chatbot memory usage exceeds 512MB"

- alert: ChatbotMemoryCritical
  expr: (process_resident_memory_bytes / node_memory_MemTotal_bytes) > 0.80  # 80% of available
  for: 5m
  annotations:
    summary: "Chatbot memory usage exceeds 80% of available"

- alert: ChatbotDependencyDown
  expr: up{job="gemma"} == 0 OR up{job="backend"} == 0
  for: 2m
  annotations:
    summary: "Critical dependency (Gemma or Backend) is down"
```

### Monitoring Dashboard Requirements

**Key Metrics to Track:**
- Request rate (RPS)
- Error rate (%)
- Latency percentiles (p50, p95, p99)
- Dependency health (Gemma, Backend, Reranker)
- Cache hit rate
- Memory usage (with trend line)
- CPU usage
- Degraded mode events (fallback activations)

**Dashboard Panels:**
1. **Service Health:** Overall status, dependency health matrix
2. **Performance:** RPS, latency percentiles, response time distribution
3. **Reliability:** Error rate, error types, retry counts
4. **Resources:** Memory usage, CPU usage, cache hit rate
5. **Dependencies:** Gemma availability, Backend API health, Reranker status

---

## Updated Remediation Roadmap (Priority-Ordered)

### **P0 (Blocking Production Deployment)** — 4-6 hours

| # | Issue | Owner | Est. Time | Status |
|---|-------|-------|-----------|--------|
| 1 | Fix Reranker Hard Dependency | Backend Team | 2h | ❌ Not started |
| 2 | Fix Unbounded Memory Growth | Backend Team | 1h | ❌ Not started |
| 3 | Fix Silent Error Swallowing | Backend Team | 1.5h | ❌ Not started |

### **P1 (High Priority, Should Fix Before Scale)** — 8-12 hours

| # | Issue | Owner | Est. Time | Status |
|---|-------|-------|-----------|--------|
| 4 | Remove Type Safety Violations | Backend Team | 4h | ❌ Not started |
| 5 | Implement Graceful Degradation | Backend Team | 3h | ❌ Not started |
| 6 | Fix Evaluation Runner | QA/Backend Team | 1h | ❌ Not started |

### **P2 (Medium Priority, Quality of Life)** — 6-8 hours

| # | Issue | Owner | Est. Time | Status |
|---|-------|-------|-----------|--------|
| 7 | Improve Cache Implementation | Backend Team | 2h | ❌ Not started |
| 8 | Make Confidence Weights Configurable | ML/Backend Team | 1h | ❌ Not started |
| 9 | Fix Model Path Resolution | Backend Team | 30m | ❌ Not started |
| 10 | Add CSV Reload Synchronization | Backend Team | 1.5h | ❌ Not started |

### **P3 (Low Priority, Nice to Have)** — 16+ hours

| # | Issue | Owner | Est. Time | Status |
|---|-------|-------|-----------|--------|
| 11 | Improve Warmup Error Handling | Backend Team | 30m | ❌ Not started |
| 12 | Add Comprehensive Testing | QA/Backend Team | 12h+ | ❌ Not started |
| 13 | Improve Documentation | Tech Writing | 4h+ | ❌ Not started |

**Total Estimated Effort:** ~40 hours of focused engineering.

---

## Conclusion

The codebase has made **significant architectural improvements** (thin bootstrap, unified config, modular routing). However, **critical production blockers remain**:

1. **Reranker hard dependency** will cause service crashes.
2. **Unbounded memory growth** will cause OOM kills.
3. **Silent error swallowing** will hide production issues.

**Recommendation:** Address P0 items before any production deployment. The service is architecturally sound but operationally fragile. With P0 fixes, it can handle moderate load. With P1 fixes, it becomes production-ready for scale.

**Go/No-Go Decision:** 🚫 **NO-GO for production deployment** until P0 items are resolved.

**Next Steps:**
1. Assign P0 items to Backend Team (4-6 hours).
2. Set up CI pipeline with evaluation harness.
3. Configure Prometheus alerting.
4. Schedule follow-up review after P0 completion.

---

_Last Updated: November 2025 (Post-refactoring assessment)_  
_Next Review: After P0 remediation_
