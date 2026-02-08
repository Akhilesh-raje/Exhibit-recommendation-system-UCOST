# Chatbot Mini

> Integrated documentation now lives in the monorepo root `README.md` under **Subsystem Guides → Chatbot Mini**. This file remains a quick reference for local work.

Lightweight Express service that powers the museum / discovery-hub chatbot. It combines CSV grounded facts with Gemma-powered exhibit recommendations and now responds with plain-text, structured JSON that the frontend can render deterministically.

## Quick Start

1. Install dependencies
```bash
npm install
```
2. Ensure supporting services are running
   - Gemma recommend API (default `http://127.0.0.1:8011`)
   - Exhibit backend API (default `http://localhost:5000/api`)
3. Start the chatbot (development mode with hot reload)
```bash
   npm run dev
```
4. Health check
```bash
curl http://localhost:4321/health
```
5. Production build
   ```bash
   npm run build
   npm start
   ```

## Testing

Baseline smoke and integration tests cover intent parsing, CSV routing, and the `/chat` API contract. Run them with:

```bash
npm run test
```

The scripts use `tsx` so there is no additional test runner setup required.

## Folder Structure

```
src/
  chatbot/
    answer.ts     # Plain-text answer formatting + quality scoring
    config.ts     # Immutable service configuration knobs
    csv.ts        # CSV bootstrap, topic filtering, cached data access
    gemma.ts      # Gemma recommend + exhibit detail fetchers
    nlp.ts        # Normalization, intent parsing, greetings
    reranker.ts   # Logistic reranker for Gemma candidates
    routes.ts     # Express router exposing /chat, /reload-csv, /health
  server.ts       # Thin bootstrap that mounts the router
docs/
  exhibits.csv    # Canonical CSV used for grounding (optional but recommended)
```

## Endpoints

### `POST /chat`
  - Body: `{ "message": string }`
- Response (success):
  ```jsonc
  {
    "answer": "Plain-text summary...",
    "exhibits": [
      {
        "id": "cmf97q5bu0004snwdrse4ovgo",
        "name": "AI Lab",
        "category": "ai-and-robotics",
        "floor": "first",
        "location": "Innovation Gallery",
        "interactiveFeatures": ["image recognition", "robotics"],
        "mapLocation": { "x": 12, "y": 34, "floor": "first" },
        "gemmaScore": 0.91,
        "rerankScore": 0.87
      }
    ],
    "sources": [{ "source": "cmf97q5bu0004snwdrse4ovgo", "name": "AI Lab" }],
    "confidence": 0.92,
    "quality": 0.88,
    "latencyMs": 215,
    "notice": null
  }
  ```
- Error responses return appropriate HTTP status codes (`400`, `503`, `500`, …) with the same shape and empty `exhibits/sources` arrays.

### `POST /reload-csv`
- Reloads `docs/exhibits.csv` (or the closest fallback path) into memory.

### `GET /health`
- Reports Gemma / backend availability, CSV load status, and basic service metadata.

### `GET /metrics` and `GET /prom-metrics`
- Provides lightweight JSON stats as well as Prometheus-formatted counters/histograms for observability.

## Architecture Highlights

- **Single source of truth**: `src/server.ts` now only wires middleware and mounts `createChatRouter`. All business logic lives under `src/chatbot/`.
- **Immutable config**: `CONFIG` is frozen at module load and never mutated at runtime. Per-request overrides are passed as function options instead.
- **Plain responses**: `generateAnswer` emits plain-text output without Markdown or emoji. The API response includes structured exhibit data so the UI can format freely.
- **Consistent NLP pipeline**: stopwords and synonym handling are centralised in `nlp.ts`. CSV, intent parsing, and reranking all agree on the same token filters.
- **Error contract**: helper `respond()` ensures status codes, confidence/quality scores, and timing data are consistent across every exit path.
- **Built-in throttling**: `src/server.ts` includes coarse IP-based request limiting and redacts logged payloads to reduce PII risk.

## Data Sources

- **CSV grounding**: `docs/exhibits.csv` is loaded on startup (and can be reloaded). Fields like `aliases`, `interactiveFeatures`, and `floor` enrich the Gemma results.
- **Realtime details**: Gemma recommendations only provide IDs + scores; `routes.ts` batches detail fetches from the backend API and caches results for ~2 minutes.

## Historical Critique

`CRITIQUE.md` documents the earlier postmortem review and remains as a historical record. The issues called out there (duplicate `/chat` implementations, Markdown-heavy responses, status-code misuse, weak stopword handling, etc.) have been addressed in the current codebase. Keep the critique for context when auditing future regressions.