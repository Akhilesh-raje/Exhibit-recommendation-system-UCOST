# UCOST Discovery Hub - Desktop Application

**Complete Museum Management System for Windows**

## 🎯 **Overview**

The UCOST Discovery Hub desktop application is a comprehensive museum management system that runs natively on Windows. It includes AI-powered recommendations, secure P2P synchronization, and complete exhibit management capabilities.

## 🚀 **Key Features**

### **✅ Complete Package**
- **Native Windows .exe** with UCOST branding
- **All resources included** - no external dependencies
- **Professional installer** with desktop shortcuts
- **Standalone operation** - works offline

### **✅ Service Management**
- **Automatic service startup** - all services start on launch
- **Health monitoring** - automatic service health checks
- **Port conflict resolution** - finds available ports automatically
- **Graceful shutdown** - clean service termination

### **✅ AI-Powered Features**
- **Intelligent recommendations** - AI-powered exhibit suggestions
- **Chatbot assistant** - conversational AI for visitor queries
- **OCR capabilities** - Hindi/English text recognition
- **Semantic search** - advanced search with embeddings

## 📦 **Installation**

### **System Requirements**
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB available space
- **Python**: 3.10+ (for AI services)
- **Network**: Optional (for P2P sync)

### **Quick Installation**

1. **Download** `UCOST Discovery Hub Setup 1.0.0.exe`
2. **Run** the installer
3. **Follow** the installation wizard
4. **Launch** from Start Menu or Desktop shortcut

### **First Launch**

1. **Start** the application
2. **Wait** for services to initialize (splash screen shows progress)
3. **Access** admin panel at `http://localhost:5173`
4. **Login** with default credentials:
   - Email: `admin@ucost.com`
   - Password: `admin123`
5. **Change** password after first login

## 🔧 **Development**

### **Prerequisites**
- Node.js 18+
- Python 3.10+
- npm or yarn

### **Setup**

```bash
cd desktop
npm install
```

### **Development Mode**

```bash
npm run dev
```

Runs the app in development mode using system services.

### **Production Build**

```bash
# Build all services (backend, frontend, chatbot)
npm run build

# Create Windows installer (.exe)
npm run package

# Create distribution directory (without installer)
npm run package:dir

# Pre-deployment validation
npm run pre-deploy
```

The build process:
1. Builds backend, frontend, and chatbot services
2. Copies all resources to Electron app structure
3. Packages everything into a Windows installer
4. Includes all Python services (embed, gemma, OCR) as resources
5. Bundles CSV data and configuration files

## 📁 **Project Structure**

```
desktop/
├── main.js                      # Main Electron process entry point
├── package.json                 # Dependencies and Electron Builder config
├── src/                         # Source modules
│   ├── config.js                # Service configurations and port management
│   ├── service-manager.js       # Service lifecycle management (start/stop/health)
│   ├── window-manager.js        # Electron window creation and management
│   ├── database-manager.js      # Database initialization and setup
│   ├── frontend-server.js       # Static file serving for frontend
│   ├── logger.js                # Centralized logging system
│   ├── env-setup.js             # Environment variable setup
│   ├── env-validator.js         # Environment validation
│   ├── prisma-manager.js        # Prisma client management
│   ├── admin-seeder.js          # Default admin user creation
│   ├── frontend-config.js       # Frontend configuration injection
│   ├── deployment-validator.js  # Pre-deployment validation
│   └── preload.js               # Electron preload script
├── scripts/                     # Build and deployment scripts
│   ├── build-all.js             # Automated build for all services
│   ├── pre-deploy-check.js      # Pre-deployment validation
│   ├── create-icon.js           # Icon generation script
│   ├── start-desktop.bat        # Windows batch launcher
│   └── start-desktop.sh         # Unix shell launcher
├── build/                       # Build resources
│   ├── icon.ico                 # Windows application icon
│   └── icon-placeholder.txt     # Icon placeholder info
└── dist/                        # Distribution output (generated)
    └── UCOST Discovery Hub Setup 1.0.0.exe  # Windows installer
```

## 🏗️ **Architecture**

### **Services**

| Service | Type | Port | Description |
|---------|------|------|-------------|
| Backend | Node.js | 5000 | REST API, exhibit management |
| Frontend | React | 5173 | Admin dashboard UI |
| Chatbot | Node.js | 4321 | Conversational AI |
| Embed | Python | 8001 | Text embeddings |
| Gemma | Python | 8011 | AI recommendations |
| OCR | Node.js | 8088 | Text recognition |

### **Service Startup Order**

The desktop app manages service startup in a specific order to handle dependencies:

1. **Backend** (port 5000) - Must start first as other services depend on it
2. **Embed, Gemma, OCR** (ports 8001, 8011, 8088) - Can start in parallel
3. **Chatbot** (port 4321) - Depends on backend and Gemma services
4. **Frontend** (port 5173) - Served via Electron's static file server

### **Service Management Features**

- **Automatic Port Detection**: Finds available ports if defaults are in use
- **Health Monitoring**: Continuous health checks for all services
- **Graceful Shutdown**: Clean termination of all services on app close
- **Error Recovery**: Automatic retry logic for failed service starts
- **Log Aggregation**: Centralized logging for all services

## 🔐 **Configuration**

### **Environment Variables**

- `NODE_ENV` - Development or production
- `JWT_SECRET` - JWT signing secret (auto-generated if not set)
- `DATABASE_URL` - SQLite database path (auto-configured)
- `PORT` - Service ports (auto-assigned)

### **User Data Directory**

All user data is stored in:
```
%APPDATA%/UCOST Discovery Hub/
├── database.db      # SQLite database
├── uploads/         # Uploaded files
├── logs/            # Application logs
└── cache/           # Cache files
```

## 🐛 **Troubleshooting**

### **Common Issues**

**Services won't start:**
- Check Python installation: `python --version`
- Check Node.js installation: `node --version`
- Check port availability
- Review logs in `%APPDATA%/UCOST Discovery Hub/logs/`

**App won't launch:**
- Run as administrator
- Check Windows compatibility
- Review error logs

**Database errors:**
- Database is auto-created on first run
- Check write permissions in user data directory
- Review Prisma logs

**Python services fail:**
- Ensure Python 3.10+ is installed
- Install dependencies: `pip install -r requirements.txt`
- Check Python is in PATH

### **Logs**

Logs are located at:
```
%APPDATA%/UCOST Discovery Hub/logs/app-YYYY-MM-DD.log
```

## 📚 **Documentation**

- [Installation Guide](./INSTALLATION.md) - Detailed setup instructions
- [Quick Start](./QUICK_START.md) - Quick reference guide
- [Complete Analysis](./COMPLETE_ANALYSIS.md) - Full analysis report

## 🤝 **Support**

- **Email**: support@ucost.uk.gov.in
- **Documentation**: See `docs/guides/` directory
- **Issues**: Check logs in user data directory

## 📄 **License**

MIT License - Copyright © Uttarakhand Science and Technology Council

---

**🎉 UCOST Discovery Hub Desktop - Empowering museums with intelligent technology!**

