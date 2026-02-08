# Installation & Setup Guide

## 📦 **Installation**

### **System Requirements**

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB available space
- **Python**: 3.10+ (required for AI services)
- **Node.js**: 18+ (for development only)

### **Installer Installation**

1. **Download** the installer: `UCOST Discovery Hub Setup 1.0.0.exe`
2. **Run** the installer (may require administrator privileges)
3. **Choose** installation directory (default: `C:\Program Files\UCOST Discovery Hub`)
4. **Complete** the installation wizard
5. **Launch** from Start Menu or Desktop shortcut

### **First Launch**

1. **Start** the application
2. **Wait** for services to initialize (splash screen shows progress)
3. **Access** the admin panel (opens automatically)
4. **Login** with default credentials:
   - Email: `admin@ucost.com`
   - Password: `admin123`
5. **⚠️ IMPORTANT**: Change password immediately after first login

## 🔧 **Development Setup**

### **Prerequisites**

1. **Node.js 18+**: Download from [nodejs.org](https://nodejs.org)
2. **Python 3.10+**: Download from [python.org](https://python.org)
3. **Git**: For version control

### **Installation Steps**

1. **Clone** the repository:
   ```bash
   git clone <repository-url>
   cd "uc work"
   ```

2. **Install** desktop dependencies:
   ```bash
   cd desktop
   npm install
   ```

3. **Install** Python dependencies:
   ```bash
   # Embed Service
   cd ../project/embed-service
   pip install -r requirements.txt
   
   # Gemma
   cd ../../gemma
   pip install -r requirements.txt
   
   # OCR Engine
   cd ../project/ocr-engine
   pip install -r requirements.txt
   ```

4. **Build** all services:
   ```bash
   cd ../../desktop
   npm run build
   ```

5. **Run** in development mode:
   ```bash
   npm run dev
   ```

## 🐛 **Troubleshooting**

### **Installation Issues**

**Installer won't run:**
- Right-click → Run as Administrator
- Check Windows Defender/antivirus isn't blocking
- Ensure Windows 10/11 (64-bit)

**Installation fails:**
- Check available disk space (need 1GB+)
- Check write permissions
- Review Windows Event Viewer for errors

### **Service Startup Issues**

**Services won't start:**

1. **Check Python:**
   ```bash
   python --version
   # Should show Python 3.10 or higher
   ```

2. **Check Node.js:**
   ```bash
   node --version
   # Should show v18 or higher
   ```

3. **Check ports:**
   - Default ports: 5000, 4321, 8001, 8011, 8088, 5173
   - If ports are in use, app will auto-find alternatives
   - Check with: `netstat -ano | findstr :5000`

4. **Check logs:**
   ```
   %APPDATA%/UCOST Discovery Hub/logs/app-YYYY-MM-DD.log
   ```

**Python services fail:**

1. **Verify Python installation:**
   ```bash
   python --version
   ```

2. **Install dependencies:**
   ```bash
   cd project/embed-service
   pip install -r requirements.txt
   
   cd ../../gemma
   pip install -r requirements.txt
   
   cd ../project/ocr-engine
   pip install -r requirements.txt
   ```

3. **Check Python PATH:**
   - Python should be in system PATH
   - Test: `python -c "import sys; print(sys.executable)"`

**Backend service fails:**

1. **Check database:**
   - Database is auto-created on first run
   - Location: `%APPDATA%/UCOST Discovery Hub/database.db`
   - Check write permissions

2. **Check Prisma:**
   ```bash
   cd project/backend/backend
   npx prisma generate
   npx prisma db push
   ```

3. **Check JWT_SECRET:**
   - Auto-generated if not set
   - Warning shown in logs if using generated secret

### **Runtime Issues**

**App won't launch:**

1. **Check Windows compatibility:**
   - Windows 10/11 (64-bit) required
   - Check Windows version: `winver`

2. **Run as administrator:**
   - Right-click → Run as Administrator

3. **Check antivirus:**
   - May block Electron apps
   - Add exception if needed

4. **Check logs:**
   ```
   %APPDATA%/UCOST Discovery Hub/logs/
   ```

**Frontend won't load:**

1. **Check frontend server:**
   - Should start on port 5173
   - Check: `http://localhost:5173`

2. **Check service status:**
   - All services must be running
   - Check splash screen for errors

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for errors

**Database errors:**

1. **Check database file:**
   ```
   %APPDATA%/UCOST Discovery Hub/database.db
   ```

2. **Check permissions:**
   - Ensure write access to user data directory

3. **Reset database:**
   - Delete `database.db` (will be recreated)
   - ⚠️ This will delete all data!

**Port conflicts:**

- App automatically finds available ports
- Check logs for actual ports used
- Update frontend config if needed

### **Performance Issues**

**Slow startup:**

- First launch takes longer (database initialization)
- Subsequent launches should be faster
- Check system resources (RAM, CPU)

**High memory usage:**

- AI services use significant memory
- Close other applications
- Consider increasing RAM

**Slow service startup:**

- Python services may take time to load models
- Check Python dependencies are installed
- Review service logs

## 📍 **File Locations**

### **Application Files**

- **Installer**: `dist/UCOST Discovery Hub Setup 1.0.0.exe`
- **Unpacked App**: `dist/win-unpacked/`
- **Source Code**: `desktop/`

### **User Data**

- **Database**: `%APPDATA%/UCOST Discovery Hub/database.db`
- **Uploads**: `%APPDATA%/UCOST Discovery Hub/uploads/`
- **Logs**: `%APPDATA%/UCOST Discovery Hub/logs/`
- **Cache**: `%APPDATA%/UCOST Discovery Hub/cache/`

### **Logs**

- **Application Logs**: `%APPDATA%/UCOST Discovery Hub/logs/app-YYYY-MM-DD.log`
- **Service Logs**: Check individual service outputs in console

## 🔐 **Security**

### **Default Credentials**

- **Email**: `admin@ucost.com`
- **Password**: `admin123`
- **⚠️ CHANGE IMMEDIATELY** after first login

### **JWT Secret**

- Auto-generated if not set
- Warning shown in logs
- Set `JWT_SECRET` environment variable for production

### **Database**

- SQLite database stored locally
- No cloud sync (privacy-focused)
- Regular backups recommended

## 📞 **Getting Help**

### **Logs**

Always check logs first:
```
%APPDATA%/UCOST Discovery Hub/logs/app-YYYY-MM-DD.log
```

### **Support**

- **Email**: support@ucost.uk.gov.in
- **Documentation**: See `docs/guides/` directory
- **GitHub Issues**: (if applicable)

### **Common Solutions**

1. **Restart the application**
2. **Check logs** for specific errors
3. **Verify** Python and Node.js installations
4. **Check** port availability
5. **Review** service health in logs

---

**For more information, see [README.md](./README.md) and [QUICK_START.md](./QUICK_START.md)**

