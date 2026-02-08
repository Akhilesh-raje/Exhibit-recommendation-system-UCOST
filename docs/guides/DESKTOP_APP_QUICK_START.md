# Desktop App Conversion - Quick Start Guide

## 🎯 Overview

This is a quick reference guide for converting the UCOST Discovery Hub into a desktop application. For the complete detailed plan, see [DESKTOP_APP_CONVERSION_PLAN.md](./DESKTOP_APP_CONVERSION_PLAN.md).

## 📋 Current State

- **Basic Electron wrapper** exists in `desktop/main.js`
- **Loads frontend URL** from environment variable
- **No service management** - requires manual service startup
- **No offline capability**

## 🎯 Target State

- **Self-contained desktop app** with all services bundled
- **Automatic service startup** on app launch
- **Offline operation** - no external dependencies
- **Single installer** - easy distribution

## 🏗️ Architecture Overview

```
Electron Main Process
├── Service Manager (starts/stops all services)
├── Window Manager (creates Electron windows)
└── Embedded Services
    ├── Backend API (Node.js, port 5000)
    ├── Frontend (React app, served locally)
    ├── Chatbot (Node.js, port 4321)
    ├── Embed Service (Python, port 8001)
    ├── Gemma Recommender (Python, port 8011)
    └── OCR Engine (Python, port 8088)
```

## 📝 Implementation Phases

### Phase 1: Core Infrastructure (8-12 hours)
- Service Manager (spawn/manage services)
- Window Manager (enhanced)
- IPC Communication
- Configuration Management

### Phase 2: Service Integration (12-16 hours)
- Backend Service (SQLite for desktop)
- Frontend Service (serve built React app)
- Python Services (bundle or use system Python)
- Chatbot Integration
- AI System Integration

### Phase 3: Data Management (6-8 hours)
- Database Setup (SQLite initialization)
- File Storage (user data directory)
- Data Migration (export/import)

### Phase 4: Build & Packaging (8-10 hours)
- Build Process (automated)
- Electron Builder Configuration
- Resource Bundling
- Size Optimization

### Phase 5: User Experience (6-8 hours)
- Startup Experience (splash screen)
- Error Handling
- Settings/Preferences
- Logging

### Phase 6: Testing & QA (4-6 hours)
- Unit Tests
- Integration Tests
- Manual Testing
- Performance Testing

**Total Estimated Time**: 40-60 hours

## 🚀 Quick Start Implementation

### Step 1: Create Service Manager

```bash
mkdir -p desktop/src
```

Create `desktop/src/service-manager.js` (see full plan for complete code)

### Step 2: Update Main Process

Update `desktop/main.js` to:
1. Initialize database
2. Start all services
3. Create window after services are ready

### Step 3: Build Process

Create `desktop/scripts/build.js` to:
1. Build frontend
2. Build backend
3. Bundle Python services
4. Package with electron-builder

### Step 4: Test

```bash
cd desktop
npm run dev  # Development mode
npm run package  # Create installer
```

## ⚠️ Key Challenges

1. **App Size**: AI models are large (500MB+)
   - **Solution**: Make optional, use quantization, or provide lite version

2. **Python Runtime**: Bundling Python increases size
   - **Solution**: Use PyInstaller or allow system Python

3. **Port Conflicts**: Default ports might be in use
   - **Solution**: Automatic port finding (implemented in plan)

4. **Service Dependencies**: Services depend on each other
   - **Solution**: Start in order, wait for health checks

## 📦 Estimated App Size

- **Base**: ~100MB (Electron + frontend + backend)
- **With Python Runtime**: +50MB
- **With AI Models**: +800MB (Gemma: 500MB, OCR: 200MB, Embed: 100MB)
- **Total**: ~950MB (without optimization)
- **Target**: <500MB (with optimizations)

## ✅ Success Criteria

- [ ] All services start automatically
- [ ] Frontend loads and works
- [ ] All features functional
- [ ] App installs/uninstalls cleanly
- [ ] Data persists between sessions
- [ ] Startup time <30 seconds
- [ ] App size <500MB (optimized)

## 📚 Next Steps

1. Review the [complete plan](./DESKTOP_APP_CONVERSION_PLAN.md)
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews

## 🔗 Related Documents

- [Complete Conversion Plan](./DESKTOP_APP_CONVERSION_PLAN.md)
- [Desktop README](../DESKTOP_README.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)

---

**For detailed implementation, see [DESKTOP_APP_CONVERSION_PLAN.md](./DESKTOP_APP_CONVERSION_PLAN.md)**

