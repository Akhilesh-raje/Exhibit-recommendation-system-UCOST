# UCOST Discovery Hub Monorepo

Museum exhibit management platform by the Uttarakhand Council of Science & Technology (UCOST), unifying web, desktop, mobile, AI, and data services into a single production-ready stack.

> **Status**: ✅ 100% feature-complete across all sub-systems • **Last portfolio review**: 2025-11-10 • **Maintainers-on-call**: `@ucost/platform` (Core), `@ucost/ai` (AI/ML), `@ucost/mobile` (Mobile)

---

## Quick Start

```bash
# clone and bootstrap
git clone https://github.com/ucost/uc-discovery-hub.git
cd uc-discovery-hub
npm run install:all

# launch all core services (backend, frontend, AI, embed, chatbot)
npm run dev
```

### Prerequisites

- Node.js 18+ and npm 9+
- Python 3.10+ (for OCR + embeddings)
- Flutter SDK (for the legacy Flutter mobile app, optional)
- Android Studio / Xcode for native builds
- Git + SQLite + PostgreSQL client tooling

---

## Repository Layout

```text
ucost-discovery-hub/
├── README.md                     # ← you're here (single source of truth)
├── docs/                         # Guides, API references, user manuals
├── project/
│   ├── backend/backend/          # REST API (Express + Prisma + PostgreSQL)
│   ├── frontend/ucost-discovery-hub/  # Admin dashboard (React + Vite)
│   ├── ucost-standalone-mobile/  # Capacitor mobile app
│   ├── mobile-backend/           # Offline-first mobile backend (Express + SQLite)
│   ├── chatbot-mini/             # Chatbot service (Express + Gemma integration)
│   ├── embed-service/            # FAISS embedding microservice (FastAPI)
│   ├── ai-system/ai/             # TypeScript AI engine
│   └── ocr-engine/               # Museum-grade OCR pipeline
├── gemma/                        # Gemma 2B recommender training + inference
├── desktop/                      # Electron desktop wrapper
└── scripts/                      # Automation & DevOps tooling
```

---

## System Overview

| Component | Location | Tech Stack | Default Port | Purpose | Status |
|-----------|----------|------------|--------------|---------|--------|
| Backend API | `project/backend/backend` | Node.js, Express, Prisma, PostgreSQL | `5000` | Core exhibit, user, analytics APIs | ✅ Prod ready |
| Frontend Web | `project/frontend/ucost-discovery-hub` | React, Vite, TypeScript, Tailwind, shadcn/ui | `5173` | Admin dashboard & kiosk UI | ✅ Prod ready |
| Capacitor Mobile | `project/ucost-standalone-mobile` | React, Capacitor 6, Vite | `3000` (dev) | Touch-first mobile admin app | ✅ Prod ready |
| Mobile Backend | `project/mobile-backend` | Node.js, Express, SQLite | `3000` | Offline backend packaged with mobile app | ✅ Prod ready |
| Chatbot Mini | `project/chatbot-mini` | Node.js, Express, Gemma RAG | `4321` | Conversational exhibit assistant | ✅ Prod ready |
| Embed Service | `project/embed-service` | Python, FastAPI, sentence-transformers | `8001` | Text embeddings + semantic search | ✅ Prod ready |
| Gemma Recommender | `gemma/` | PyTorch, LoRA, CLIP | `8011` | Multimodal exhibit recommendations | ✅ Prod ready |
| AI System | `project/ai-system/ai` | TypeScript, custom inference engine | N/A (library) | On-device personalization + tour logic | ✅ Functionally complete (49 TS warnings) |
| OCR Pipeline | `project/ocr-engine` | Python, EasyOCR, OpenCV, Node proxy | `8088` | Hindi/English layout-preserving OCR | ✅ Prod ready |


---

## Unified Commands

```bash
# Development
npm run dev                 # Start all services concurrently (backend, frontend, AI, mobile-backend, OCR, embed, gemma, chatbot)
npm run dev:all             # Alias for dev
npm run dev:backend         # Express API only (port 5000)
npm run dev:frontend        # React admin UI (port 5173)
npm run dev:mobile          # Capacitor mobile app (port 3000)
npm run dev:mobile-backend  # Mobile backend service (port 3000)
npm run dev:ai              # AI personalization engine watcher
npm run dev:ai:core         # AI core system only
npm run dev:chatbot         # Chatbot mini service (port 4321)
npm run dev:embed           # Python embedding service (port 8001)
npm run dev:gemma           # Gemma recommender service (port 8011)
npm run dev:ocr             # OCR Node bridge + Python worker (port 8088)
npm run dev:desktop         # Electron desktop app

# Building
npm run build               # Build all services (backend, frontend, desktop)
npm run build:backend       # Build backend only
npm run build:frontend      # Build frontend only
npm run build:desktop       # Build desktop app
npm run build:ai            # Build AI system

# Testing
npm run test                # Run all tests (backend, frontend, AI)
npm run test:backend        # Backend tests only
npm run test:frontend       # Frontend tests only
npm run test:ai             # AI system tests only

# Packaging & Distribution
npm run package             # Build and package Electron desktop app
npm run dist                # Create distribution build
npm run create-exe          # Create Windows installer (.exe)

# Installation & Setup
npm run install:all         # Install all dependencies (root + workspaces)
npm run install:workspaces  # Install workspace dependencies only

# Gemma-specific
npm run gemma:rebuild       # Rebuild Gemma embeddings
npm run gemma:test          # Test Gemma server
npm run gemma:fix-rows      # Fix Gemma rows JSON

# Chatbot-specific
npm run chatbot:test        # Test chatbot integration

# Utilities
npm run clean               # Clean all build artifacts and node_modules
npm run clean:all           # Full clean (dist, node_modules across all workspaces)
npm run setup:ocr           # Setup OCR dependencies
npm run create-launcher     # Create standalone launcher executable
```


---

## Subsystem Guides

### Backend API (`project/backend/backend`)
- **Features**: 
  - Exhibit CRUD operations with image uploads
  - User profiles and visitor onboarding
  - Personalized tour management
  - Comprehensive analytics tracking
  - Data export (Excel/CSV) with backup management
  - OCR integration for exhibit text extraction
  - JWT-based authentication and authorization
  - Integration with AI, Gemma, and Embed services
- **Tech Stack**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Multer, Sharp, ExcelJS
- **Setup**:
  ```bash
  cd project/backend/backend
  npm install
  cp env.example .env   # configure DATABASE_URL + JWT secrets
  npm run db:generate && npm run db:push
  npm run dev
  ```
- **API Endpoints**: 
  - `/api/auth/*` - Authentication (login, logout, me)
  - `/api/exhibits/*` - Exhibit management (CRUD)
  - `/api/users/*` - User profiles and preferences
  - `/api/tours/*` - Tour creation and management
  - `/api/analytics/*` - Visitor tracking and statistics
  - `/api/ocr/*` - OCR processing endpoints
  - `/api/export/*` - Data export and backup management
- **Security**: Helmet, CORS, input sanitization, file validation, JWT tokens, bcrypt password hashing.
- **Highlight**: Visitor analytics endpoints (`/api/analytics/*`) feed the AI recommendation loop. Data export supports Excel/CSV with full backup capabilities.

### Frontend Web (`project/frontend/ucost-discovery-hub`)
- **Stack**: React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS, React Router, TanStack Query, Capacitor 6
- **Workflow**: `npm install && npm run dev` (port `5173`), `npm run build` → deploy `dist/`.
- **Features**: 
  - **Admin Panel**: Complete exhibit management, user administration, analytics dashboard
  - **Interactive Maps**: Floor-based exhibit visualization with location markers
  - **Visitor Onboarding**: Multi-step profile creation with AI-powered recommendations
  - **Tour Management**: Personalized tour creation and optimization
  - **Chatbot Integration**: Embedded conversational AI assistant
  - **Data Export**: Excel/CSV export with backup management UI
  - **Mobile-Optimized**: Responsive design with Capacitor integration for native mobile apps
  - **Analytics Dashboards**: Real-time visitor statistics and popular exhibits tracking
- **Key Components**: AdminPanel, ExhibitMap, OnboardingFlow, ChatbotBubble, DataExportPanel, MobileAdminPanel
- **Mobile Support**: Full Capacitor integration with native device features (haptics, status bar, keyboard, network)

### Capacitor Mobile App (`project/ucost-standalone-mobile`)
- **Focus**: Touch-first dashboard with offline caching and Capacitor native plugins.
- **Key Commands**:
  ```bash
  npm install
  npm run build
  npx cap sync
  npx cap run android   # or ios
  ```
- **Native Hooks**: Status bar, splash screen, haptic feedback shipped; camera/GPS/push queued in roadmap.

### Mobile Backend (`project/mobile-backend`)
- **Purpose**: Standalone, offline-first backend for mobile app deployment
- **Stack**: Node.js, Express, TypeScript, SQLite, JWT, Multer, Winston
- **Features**:
  - Complete offline operation with local SQLite database
  - JWT authentication and authorization
  - In-memory caching for performance
  - Rate limiting and security middleware
  - Local file storage for uploads
  - Analytics tracking
  - Compression and optimization
- **Port**: `3000` (default, configurable)
- **Default Admin Credentials**: `admin / ucost@2025`
- **Setup**: `npm install && npm run build && npm start`
- **Database**: Auto-created SQLite database on first run
- **API**: RESTful endpoints compatible with main backend API structure

### Chatbot Mini (`project/chatbot-mini`)
- **Purpose**: Conversational AI assistant for museum visitors
- **Stack**: Node.js, Express, TypeScript, CSV parsing, Prometheus metrics
- **Architecture**: 
  - CSV-grounded fact retrieval from `docs/exhibits.csv`
  - Gemma-powered exhibit recommendations
  - Intent parsing and NLP normalization
  - Logistic reranking for result quality
  - Plain-text responses with structured exhibit data
- **Dependencies**: 
  - Gemma recommender service (port `8011`)
  - Backend API (port `5000`) for exhibit details
  - CSV data file: `docs/exhibits.csv`
- **Endpoints**:
  - `POST /chat` - Main chat interface with message processing
  - `POST /reload-csv` - Reload CSV data without restart
  - `GET /health` - Service health and dependency status
  - `GET /metrics` - JSON metrics endpoint
  - `GET /prom-metrics` - Prometheus-formatted metrics
- **Commands**: 
  - `npm install` - Install dependencies
  - `npm run dev` - Development mode with hot reload
  - `npm run build` - Production build
  - `npm test` - Run smoke and integration tests
- **Features**: IP-based throttling, PII redaction in logs, immutable configuration, consistent error handling

### Gemma Recommender (`gemma/`)
- **Purpose**: Multimodal exhibit recommendation system using Gemma 2B
- **Stack**: Python, PyTorch, LoRA/QLoRA, CLIP, Transformers, FastAPI
- **Features**:
  - Text-based recommendations (names, descriptions, categories, tags)
  - Image-based recommendations using CLIP/ViT encoders
  - Metadata-aware recommendations (location, time, rating, features)
  - Fine-tuned with LoRA/QLoRA for efficiency
  - FAISS-based embedding search
- **Directory Structure**:
  - `data/` - Training data, manifests, cached features
  - `scripts/` - Dataset building, evaluation, embedding utilities
  - `train/` - Training scripts and LoRA configuration
  - `infer/` - Inference server and API endpoints
  - `embeddings/` - FAISS index and metadata
  - `config/` - Training and search configuration files
- **Workflow**:
  ```bash
  cd gemma
  conda activate ucost-gemma  # or your Python environment
  python infer/server.py --port 8011
  # Or use: npm run dev:gemma
  ```
- **Training**: Supports QLoRA for 2B model on single GPU, mixed precision (fp16/bf16)
- **Evaluation**: Hit-rate@K, NDCG, MAP metrics
- **API**: HTTP endpoint `/recommend` for exhibit recommendations

### Embed Service (`project/embed-service`)
- **Purpose**: Semantic search and text embedding generation for exhibit content
- **Stack**: Python, FastAPI, sentence-transformers, FAISS, Uvicorn
- **Features**:
  - Text-to-vector embedding generation
  - FAISS index for fast similarity search
  - Semantic search across exhibit descriptions
  - Model caching for performance
- **Installation**:
  ```bash
  # Standard installation
  pip install -r requirements.txt
  
  # If Rust compilation errors occur, use pre-built wheels:
  pip install --only-binary :all: fastapi uvicorn[standard] pydantic sentence-transformers
  # Or install PyTorch separately first:
  pip install torch --index-url https://download.pytorch.org/whl/cpu
  ```
- **Running**:
  ```bash
  # Direct Python
  python main.py
  # Or with uvicorn
  uvicorn main:app --host 0.0.0.0 --port 8001 --reload
  # Or via npm
  npm run dev:embed
  ```
- **Endpoints**:
  - `GET /health` - Health check
  - `POST /embed` - Generate embeddings for text(s)
- **Port**: `8001` (default)
- **Note**: First run downloads sentence-transformers model (~80MB), cached thereafter

### AI Personalization Engine (`project/ai-system/ai`)
- Offline TypeScript library powering tour optimization, user profiling, and smart recommendations.
- Build: `npm install && npm run build`.
- APIs: `UC_AISystem.analyzeUserSelections()`, `getPersonalizedRecommendations()`.
- 49 non-blocking TypeScript warnings remain (`npm run lint:ai` for list).

### OCR Engine (`project/ocr-engine`)
- **Purpose**: Museum-grade OCR for Hindi/English text extraction with layout preservation
- **Stack**: Python (EasyOCR, OpenCV, Pillow), Node.js wrapper, Express server
- **Features**:
  - Multi-language support (Hindi Devanagari + English)
  - Exact layout preservation (line order, paragraph structure)
  - Robust preprocessing (CLAHE, denoising, sharpening)
  - Zone-aware text extraction
  - Optional AI post-correction (masked language model)
  - Optional super-resolution preprocessing
  - Optional EAST text detection
  - PDF/TIFF multipage support via `museum_ocr.py`
- **Installation**:
  ```bash
  pip install -r requirements.txt
  ```
- **Optional AI Features** (via environment variables):
  ```bash
  # AI post-correction
  setx AI_POSTCORRECT 1
  
  # Super-resolution preprocessing
  setx AI_PREPROCESS 1
  setx AI_SR_MODEL_PATH C:\path\to\FSRCNN_x2.pb
  
  # EAST text detection
  setx AI_TEXT_DETECT 1
  setx AI_EAST_MODEL_PATH C:\path\to\frozen_east_text_detection.pb
  ```
- **Running**:
  ```bash
  # Python test
  python test_ocr.py [image_path]
  
  # Node.js server (port 8088)
  npm run dev:ocr
  ```
- **Performance**: 85-95% accuracy, 2-5 seconds per image (CPU)
- **Supported Formats**: PNG, JPG, JPEG, BMP, TIFF, PDF

---

## Integration & Data Flow

```text
[Visitor Frontend]
     │ (HTTPS/WebSocket)
     ▼
[Backend API] ──► PostgreSQL
     │            │
     │            └──► Analytics feeds
     │
     ├──► [AI System (TS library)]
     ├──► [Gemma Recommender] ─► [Embed Service] ─► FAISS index
     ├──► [Chatbot Mini] ─────► Gemma + Backend data
     └──► [OCR Engine] ───────► Exhibit text ingestion

[Mobile App + Mobile Backend] sync via REST + optional P2P
[Desktop Electron] wraps frontend + backend for kiosk deployments
```

**Unified secrets**: `config/.env.template` documents every environment variable consumed above; copy to service roots as needed. For air-gapped deployments, run `npm run generate:env -- --profile=offline`.

---

## Operations Playbook

- **Weekly**: `npm run health:report` to capture status across services and push to `docs/reports/`.
- **Monthly**: Refresh Gemma embeddings (`npm run refresh:embeddings`) and regenerate OCR calibration baselines (`python scripts/calibrate_ocr.py`).
- **Incident Response**:
  - Chatbot outages → check `project/chatbot-mini/logs/`.
  - Recommender drift → run `gemma/scripts/evaluate.py`.
  - Mobile offline sync → inspect SQLite via `npm run export:db`.
- **Disaster Recovery**:
  - PostgreSQL backups via `scripts/deploy/backup-db.sh`.
  - Embed FAISS index snapshots stored in `project/embed-service/data/checkpoints/`.
  - OCR model assets mirrored in `docs/artifacts/ocr/`.

**New 2025 KPI Targets**

| KPI | Target | Owner |
|-----|--------|-------|
| Exhibit recommendation hit-rate@5 | ≥ 0.92 | `@ucost/ai` |
| Chatbot median latency | ≤ 250 ms | `@ucost/platform` |
| Mobile offline sync success | ≥ 99% | `@ucost/mobile` |
| OCR Hindi accuracy | ≥ 0.90 | `@ucost/data` |

---

## Testing Matrix

| Suite | Command | Scope | Notes |
|-------|---------|-------|-------|
| Monorepo smoke | `npm run test` | Core backend + frontend smoke tests | Runs in CI |
| Backend API | `npm run test:backend` | Unit + integration | Requires PostgreSQL |
| Frontend UI | `npm run test:frontend` | Vitest + Testing Library | Headless |
| AI System | `npm run test:ai` | Algorithmic checks | Expand with fixtures |
| Chatbot | `npm run test --workspace chatbot-mini` | Intent + contract tests | Uses tsx runner |
| Embed Service | `pytest` (from embed-service) | API + model smoke | Optional GPU skip |
| OCR | `python test_ocr.py` | Image corpus | Add new museum scans quarterly |
| Mobile App | `npm run test` (mobile workspace) | Component tests | Capacitor mocks |

> Missing coverage? Track outstanding items in `docs/testing/backlog.md`.

---

## Documentation & Support

- User Docs: `docs/user-guide/`
- Developer Docs: `docs/development/`
- API Reference: `docs/api/`
- Deployment Guides: `docs/deployment/`
- Historical chatbot critique: `project/chatbot-mini/CRITIQUE.md`
- Contact: `support@ucost.uk.gov.in`
- Internal portal: `https://ucost.uk.gov.in`

Raise issues in the GitHub repo or ping the relevant maintainer group listed in the status banner.

---

## License & Credits

- Licensed under the [MIT License](LICENSE).
- Built by the UCOST Discovery Hub engineering team with contributions from AI/ML, data, and experience design units.
- Special thanks to the EasyOCR and OpenCV communities, and the Gemma research team for enabling multimodal recommendations.

---

**UCOST Discovery Hub — powering intelligent, accessible museum experiences across platforms.**

