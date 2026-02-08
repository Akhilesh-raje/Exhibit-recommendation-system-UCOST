# UCOST Discovery Hub - Consolidated README Guide

**Last Updated**: December 2024  
**Purpose**: Single comprehensive guide consolidating all README information

---

## 📚 Quick Navigation

- [Main Project README](../README.md) - Start here for project overview
- [Component READMEs](#component-readmes) - Individual component documentation
- [Documentation Index](./MASTER_DOCUMENTATION_INDEX.md) - Complete documentation index
- [Non-Implemented Tasks](./tasks/NON_IMPLEMENTED_TASKS.md) - Pending tasks and enhancements

---

## 🏗️ Component READMEs

All component README files are located in their respective directories. This guide provides quick access and summaries.

### Core Services

#### Backend API
- **Location**: `project/backend/backend/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: Node.js, Express, Prisma, PostgreSQL
- **Port**: 5000
- **Features**: REST API, JWT auth, file uploads, analytics, exhibit management

#### Frontend Web Application
- **Location**: `project/frontend/ucost-discovery-hub/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: React, TypeScript, Vite, Tailwind, shadcn/ui
- **Port**: 5173
- **Features**: Admin panel, exhibit management, interactive maps, analytics, chatbot integration

#### Desktop Application
- **Location**: `desktop/README.md`
- **Status**: ✅ 85% Complete (see [Non-Implemented Tasks](./tasks/NON_IMPLEMENTED_TASKS.md))
- **Tech Stack**: Electron, Node.js, React
- **Features**: Native Windows app, service management, bundled services
- **Documentation**: See `docs/desktop/` for detailed documentation

### AI/ML Services

#### AI System
- **Location**: `project/ai-system/ai/README.md`
- **Status**: ✅ 100% Functionally Complete (49 non-blocking TS warnings)
- **Tech Stack**: TypeScript, custom inference engine
- **Type**: Library (no server)
- **Features**: User profiling, smart recommendations, tour optimization, exhibit matching

#### Chatbot Mini
- **Location**: `project/chatbot-mini/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: Node.js, Express, Gemma RAG
- **Port**: 4321
- **Features**: Conversational interface, CSV grounding, Gemma reranking, health monitoring

#### Gemma Recommender
- **Location**: `gemma/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: PyTorch, LoRA, CLIP
- **Port**: 8011
- **Features**: Multimodal recommendations (text, image, metadata)

#### Embed Service
- **Location**: `project/embed-service/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: Python, FastAPI, sentence-transformers
- **Port**: 8001
- **Features**: Text embeddings, FAISS indexing, semantic search

#### OCR Engine
- **Location**: `project/ocr-engine/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: Python, EasyOCR, OpenCV, Node.js bridge
- **Port**: 8088
- **Features**: Hindi/English OCR, layout preservation, AI post-correction, web interface

### Mobile Services

#### Standalone Mobile App
- **Location**: `project/ucost-standalone-mobile/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: React, Capacitor 6, Vite
- **Port**: 3000 (dev)
- **Features**: Touch-first admin app, offline caching, native plugins

#### Mobile Backend
- **Location**: `project/mobile-backend/README.md`
- **Status**: ✅ 100% Complete & Working
- **Tech Stack**: Node.js, Express, SQLite
- **Port**: 3000
- **Features**: Offline-first, standalone operation, JWT auth, file storage

---

## 📖 Quick Start Guides

### Starting Everything
- **Location**: `README_START_EVERYTHING.md` and `START_EVERYTHING.md`
- **Purpose**: Complete setup and start guide for all services
- **Command**: `npm run start:everything`

### Development Setup
- **Location**: `docs/guides/DEVELOPMENT_GUIDE.md`
- **Purpose**: Development environment setup
- **Location**: `docs/guides/WORKFLOW_GUIDE.md`
- **Purpose**: Development workflow and practices

---

## 📁 Documentation Structure

All documentation is organized in the `docs/` folder:

```
docs/
├── README_CONSOLIDATED.md          # This file
├── MASTER_DOCUMENTATION_INDEX.md    # Complete documentation index
├── README_CONSOLIDATED_INDEX.md    # Component README index
├── tasks/                           # Non-implemented tasks
│   ├── NON_IMPLEMENTED_TASKS.md
│   ├── DESKTOP_APP_REMAINING_TASKS.md
│   └── QUICK_WINS_FOR_100_PERCENT.md
├── desktop/                         # Desktop app documentation
├── guides/                          # Setup and development guides
├── reports/                         # Analysis and status reports
├── status/                          # Status and completion reports
└── test-files/                      # Test documentation
```

---

## 🚀 Common Commands

### Development
```bash
npm run dev                 # Start all services
npm run dev:backend         # Backend only
npm run dev:frontend       # Frontend only
npm run dev:desktop         # Desktop app
```

### Building
```bash
npm run build               # Build all services
npm run build:desktop       # Build desktop app
npm run package             # Create installer
```

### Testing
```bash
npm run test                # Run all tests
npm run test:backend        # Backend tests
npm run test:frontend       # Frontend tests
```

---

## 📝 README Standards

Each component README should include:
1. **Overview** - What the component does
2. **Status** - Current completion status
3. **Features** - Key capabilities
4. **Tech Stack** - Technologies used
5. **Setup** - Installation and configuration
6. **Usage** - How to use the component
7. **API/Endpoints** - Available interfaces
8. **Architecture** - System design
9. **Deployment** - Production deployment

---

## 🔄 Maintenance

### Updating READMEs
1. Update the component README in its directory
2. Update this consolidated guide if status changes
3. Keep information synchronized with actual code
4. Remove outdated information

---

## 📞 Support

For questions about specific components:
1. Check the component's README file
2. Review the main project README
3. Check the Master Documentation Index
4. Review Non-Implemented Tasks for known issues
5. Contact the component maintainer

---

**Last Updated**: December 2024  
**Maintained By**: UCOST Development Team

