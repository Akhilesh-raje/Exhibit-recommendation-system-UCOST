# UCOST Discovery Hub - Complete Project Structure

## 📁 **Consolidated Project Directory: `porjcet/`**

This directory now contains all components of the UCOST Discovery Hub museum management system.

### 🏗️ **Core Application Components**

#### **`backend/`** - Backend API Server
- Express.js REST API
- Prisma database ORM
- Authentication middleware
- File upload handling
- Analytics endpoints

#### **`ucost-discovery-hub/`** - Frontend Web Application
- React + TypeScript web app
- Admin panel interface
- Exhibit management
- Interactive maps
- Tour creation tools
- Analytics dashboard

#### **`ai/`** - AI System Components
- Enhanced OCR Engine
- Exhibit Matching Engine
- Smart Recommendation Engine
- Tour Optimization Engine
- User Profile Analyzer
- UC AI System core

### 📱 **Mobile Application**

#### **`mobile-app/`** - Flutter Mobile App
- Cross-platform mobile application
- Android and iOS support
- QR code scanning
- P2P synchronization
- Offline functionality
- Device storage integration

### 🖥️ **Desktop Application**

#### **`electron/`** - Desktop App Wrapper
- `main.js` - Main Electron process
- `preload.js` - Security preload script
- Desktop packaging configuration

#### **`desktop-launcher.js`** - Desktop App Launcher
- Application startup script
- Development mode handling

### 🔗 **P2P & Networking**

#### **`src/p2p/`** - P2P Synchronization System
- Peer discovery mechanisms
- WebRTC connections
- Simple P2P manager
- Device-to-device sync

#### **`src/ai/`** - Standalone AI Components
- AI engines for external use
- Machine learning models
- Data processing utilities

### 🔍 **Testing & Development Tools**

#### **`ocr-ai-test/`** - OCR Testing System
- Standalone OCR application
- Image processing tools
- Text extraction testing
- Development utilities

### 🎨 **Assets & Resources**

#### **`assets/`** - Application Assets
- App icons and branding
- UCOST logo assets
- Desktop application icons
- Mobile app assets

### ⚙️ **Configuration Files**

#### **`package.json`** - Root Configuration
- Desktop app dependencies
- Build scripts
- Electron configuration
- Application metadata

#### **`README.md`** - Project Documentation
- Complete system overview
- Installation instructions
- Feature documentation
- Development guide

## 🚀 **How to Run the Complete System**

### **Development Mode**
```bash
cd porjcet
npm run dev
```

### **Desktop Application**
```bash
cd porjcet
npm run electron:dev
```

### **Mobile Application**
```bash
cd porjcet/mobile-app
flutter run
```

### **Backend Only**
```bash
cd porjcet/backend
npm run dev
```

### **Frontend Only**
```bash
cd porjcet/ucost-discovery-hub
npm run dev
```

## 🔄 **System Integration**

### **P2P Sync Flow**
1. Mobile app connects to desktop/web app
2. Devices exchange authentication
3. Data synchronizes automatically
4. Offline changes sync when online

### **AI Integration**
1. OCR processes exhibit images
2. AI engines analyze user behavior
3. Recommendations generated
4. Tour optimization applied

### **Multi-Platform Support**
- **Desktop**: Windows, macOS, Linux
- **Mobile**: Android, iOS
- **Web**: Browser-based interface
- **Kiosk**: Museum information stations

## 📊 **Data Flow**

```
Mobile App ←→ P2P Sync ←→ Desktop App
     ↓              ↓           ↓
  Local DB    ←→  Web API  ←→  Local DB
     ↓              ↓           ↓
  AI Engine   ←→  AI System ←→  AI Engine
```

## 🔐 **Security Features**

- **Time-based authentication**
- **End-to-end encryption**
- **Device verification**
- **Secure P2P connections**
- **Credential management**

## 🎯 **Key Features**

### **Museum Management**
- Exhibit upload and categorization
- Interactive multi-floor maps
- Tour creation and optimization
- Visitor analytics and insights

### **AI-Powered Intelligence**
- Smart exhibit recommendations
- User behavior analysis
- Tour optimization algorithms
- Image recognition and OCR

### **Decentralized Architecture**
- P2P device synchronization
- Local database storage
- Offline functionality
- Cross-device data sharing

This consolidated structure provides a complete, self-contained museum management system with all components working together seamlessly.
