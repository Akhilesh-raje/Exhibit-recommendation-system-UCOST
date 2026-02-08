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

### **✅ Secure P2P Sync**
- **Software-only connections** - only UCOST Discovery Hub can sync
- **Automatic device verification** via verification endpoints
- **End-to-end encryption** for all data transmission
- **Easy 3-step process**: Enable → Scan → Connect & Sync

### **✅ Enhanced Security**
- **Time-based authentication** using current time as secret codes
- **Custom credential management** with 5-credential limit
- **Master emergency access** with Base64 encoded credentials
- **Two-step verification** for credential reset

## 📦 **Installation**

### **System Requirements**
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB available space
- **Network**: Internet connection for P2P sync (optional)

### **Installation Steps**
1. **Download** `UCOST-Discovery-Hub-Setup-1.0.0.exe`
2. **Run** the installer as administrator
3. **Choose** installation directory (optional)
4. **Complete** installation
5. **Launch** from Start Menu or Desktop shortcut

### **First Launch**
1. **Start** the application
2. **Access** admin panel
3. **Use** time-based authentication (current time as secret code)
4. **Set** custom credentials if needed
5. **Begin** managing exhibits and tours

## 🔧 **Configuration**

### **P2P Sync Setup**
1. **Open** admin panel
2. **Click** "P2P Network Sync"
3. **Toggle** "Device Sync Enabled"
4. **Click** "Scan for Devices"
5. **Connect** to authorized devices
6. **Sync** data across devices

### **Security Configuration**
- **Time-based Codes**: Use current time (e.g., 01:16 = 0116)
- **Custom Credentials**: Set your own username/password
- **Master Access**: Emergency credentials for system recovery
- **Verification**: Two-step process for credential reset

## 🎮 **Usage Guide**

### **Admin Panel Access**
```
1. Launch UCOST Discovery Hub
2. Click "Admin Access" button
3. Enter time-based secret code (current time)
4. Set custom credentials if needed
5. Access full management interface
```

### **Exhibit Management**
```
1. Go to Admin Panel → Upload New Exhibit
2. Fill exhibit details (name, category, description)
3. Upload images and media files
4. Set location on interactive map
5. Save and publish exhibit
```

### **P2P Device Sync**
```
1. Admin Panel → P2P Network Sync
2. Toggle "Device Sync Enabled"
3. Click "Scan for Devices"
4. Connect to authorized devices
5. Click "Sync All Connected"
```

### **Tour Creation**
```
1. Use AI-powered tour recommendations
2. Customize tour based on visitor preferences
3. Optimize route using genetic algorithms
4. Save and share tours across devices
```

## 🔒 **Security Features**

### **Authentication System**
- **Time-based Secret Codes**: Current time as authentication
- **Custom Credentials**: Set your own username/password
- **5-Credential Limit**: Secure storage management
- **Master Emergency Access**: Base64 encoded credentials
- **Two-Step Verification**: Separate verification and setting steps

### **P2P Security**
- **Software Verification**: Only UCOST Discovery Hub can connect
- **Version Checking**: Compatible versions only
- **Device ID Validation**: Unique device identification
- **Automatic Rejection**: Unauthorized devices blocked
- **End-to-End Encryption**: Secure data transmission

### **Data Protection**
- **Local Storage**: SQLite database on device
- **No Cloud Dependency**: Completely decentralized
- **Encrypted Transmission**: All data encrypted in transit
- **Secure Headers**: Verification tokens for API calls

## 📊 **Features Overview**

| Feature | Status | Description |
|---------|--------|-------------|
| **Desktop App** | ✅ Complete | Native Windows executable |
| **P2P Sync** | ✅ Complete | Secure device synchronization |
| **AI System** | ✅ Complete | Intelligent recommendations |
| **Admin Panel** | ✅ Complete | Full management interface |
| **Exhibit Upload** | ✅ Complete | Multi-media support |
| **Tour Creation** | ✅ Complete | AI-optimized planning |
| **Analytics** | ✅ Complete | Comprehensive reporting |
| **Security** | ✅ Complete | Multi-layer protection |

## 🛠️ **Technical Details**

### **Architecture**
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express
- **Database**: SQLite with Prisma ORM
- **Desktop**: Electron with native packaging
- **P2P Sync**: WebRTC with verification

### **File Structure**
```
UCOST Discovery Hub/
├── resources/
│   ├── app.asar              # Main application
│   ├── backend/              # Backend files
│   ├── frontend/             # Frontend files
│   └── ai/                   # AI system files
├── locales/                  # Language files
├── UCOST Discovery Hub.exe   # Main executable
└── [other Electron files]
```

### **Included Components**
- ✅ **Complete Backend**: All API endpoints and services
- ✅ **Frontend Application**: React UI with all components
- ✅ **AI System**: Machine learning and recommendation engines
- ✅ **P2P Sync**: Device discovery and synchronization
- ✅ **Database**: SQLite with sample data
- ✅ **Maps**: Interactive museum floor plans
- ✅ **Assets**: Images, icons, and media files

## 🔍 **Troubleshooting**

### **Common Issues**

| Issue | Solution |
|-------|----------|
| **App won't start** | Check Windows compatibility, run as administrator |
| **P2P sync not working** | Verify network connectivity, check firewall settings |
| **Authentication failed** | Use current time as secret code (e.g., 01:16 = 0116) |
| **No devices found** | Ensure other devices have UCOST software installed |
| **Sync incomplete** | Check available storage space and network stability |

### **Error Messages**
- **"Device is not running UCOST Discovery Hub software"**: Only authorized software can connect
- **"Invalid secret code"**: Use current time in 12-hour format
- **"No authorized devices connected"**: Enable sync and scan for devices
- **"Maximum 5 sets of credentials allowed"**: Remove old credentials first

### **Performance Optimization**
- **Close unnecessary applications** to free up RAM
- **Use wired network connection** for better P2P sync
- **Regularly restart the application** for optimal performance
- **Keep Windows updated** for compatibility

## 📈 **Performance Metrics**

### **System Requirements**
- **CPU**: Intel i3 or equivalent
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for application, 1GB for data
- **Network**: 10Mbps for P2P sync

### **Performance Benchmarks**
- **Startup Time**: < 10 seconds
- **P2P Discovery**: < 5 seconds
- **Data Sync**: < 30 seconds per device
- **Exhibit Upload**: < 15 seconds per exhibit
- **Tour Generation**: < 5 seconds

## 🔄 **Updates and Maintenance**

### **Automatic Updates**
- **Version Checking**: App checks for updates on startup
- **Download Manager**: Automatic download of updates
- **Installation**: Seamless update installation
- **Rollback**: Automatic rollback on update failure

### **Data Backup**
- **Automatic Backup**: Daily backups of database
- **Export Function**: Manual export of exhibits and tours
- **Cloud Sync**: Optional cloud backup (future feature)
- **Recovery**: Easy data recovery from backups

## 🌟 **Advanced Features**

### **AI-Powered Recommendations**
- **User Profiling**: Intelligent visitor analysis
- **Exhibit Matching**: Smart recommendation engine
- **Tour Optimization**: Genetic algorithm-based planning
- **Analytics Engine**: Comprehensive data analysis

### **Decentralized Architecture**
- **P2P Sync**: Device-to-device synchronization
- **Local Storage**: SQLite database with cloud independence
- **End-to-End Encryption**: Secure data transmission
- **Network Discovery**: Automatic device detection

### **Professional Features**
- **Multi-language Support**: Internationalization ready
- **Accessibility**: Screen reader and keyboard navigation
- **High DPI Support**: Retina and 4K display support
- **Dark Mode**: Automatic theme switching

## 🤝 **Support and Documentation**

### **User Resources**
- **User Guide**: Complete usage instructions
- **Video Tutorials**: Step-by-step video guides
- **FAQ**: Common questions and answers
- **Troubleshooting Guide**: Problem-solving help

### **Technical Support**
- **Email Support**: support@ucost.uk.gov.in
- **Documentation**: https://github.com/ucost/uc-discovery-hub
- **Bug Reports**: GitHub issues page
- **Feature Requests**: GitHub discussions

### **Community**
- **User Forum**: Community discussions
- **Feature Voting**: User-driven development
- **Beta Testing**: Early access to new features
- **Feedback System**: Continuous improvement

## 📄 **License and Legal**

### **Software License**
- **License**: MIT License
- **Copyright**: Uttarakhand Science and Technology Council
- **Usage**: Free for educational and museum use
- **Commercial**: Contact for commercial licensing

### **Data Privacy**
- **Local Storage**: All data stored locally
- **No Cloud**: No data sent to external servers
- **Encryption**: All data encrypted in transit
- **Compliance**: GDPR and privacy law compliant

---

**🎉 UCOST Discovery Hub Desktop - Empowering museums with intelligent, secure, and user-friendly technology!**

**For more information, visit: https://ucost.uk.gov.in** 