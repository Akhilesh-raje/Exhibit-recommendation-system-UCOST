# 🔧 Troubleshooting Guide

## Common Issues and Solutions

---

## ❌ Application Won't Start

### Symptoms
- Double-click does nothing
- Error message appears
- Application closes immediately

### Solutions

1. **Check Task Manager**
   ```
   - Open Task Manager (Ctrl+Shift+Esc)
   - Look for "UCOST Discovery Hub" processes
   - End all processes
   - Try starting again
   ```

2. **Check Logs**
   ```
   Location: %APPDATA%\UCOST Discovery Hub\logs\
   Check: app.log for errors
   ```

3. **Reinstall**
   ```
   - Uninstall from Control Panel
   - Delete: %APPDATA%\UCOST Discovery Hub
   - Reinstall application
   ```

---

## ❌ Services Not Starting

### Symptoms
- Services show as "Error" or "Stopped"
- Recommendations don't work
- Chatbot not responding

### Solutions

1. **Check Ports**
   ```
   Required ports: 5000, 4321, 8001, 8011, 8088
   - Open Command Prompt as Admin
   - Run: netstat -ano | findstr :5000
   - If port in use, close that application
   ```

2. **Check Python**
   ```
   - Open Command Prompt
   - Run: python --version
   - Should show Python 3.8 or higher
   - If not, install Python from python.org
   ```

3. **Reinstall Dependencies**
   ```
   - Navigate to: desktop\requirements\
   - Run: install-requirements.bat
   - Wait for installation
   - Restart application
   ```

---

## ❌ Database Errors

### Symptoms
- "Database error" messages
- Data not saving
- "Database locked" errors

### Solutions

1. **Database Corrupted**
   ```
   - Close application
   - Backup: %APPDATA%\UCOST Discovery Hub\database.db
   - Delete database file
   - Restart application (recreates database)
   ```

2. **Database Locked**
   ```
   - Close all application instances
   - Wait 10 seconds
   - Restart application
   ```

3. **Permission Issues**
   ```
   - Check folder permissions
   - Location: %APPDATA%\UCOST Discovery Hub
   - Ensure full read/write access
   ```

---

## ❌ Python Not Found

### Symptoms
- "Python not found" error
- Python services won't start
- Dependency installation fails

### Solutions

1. **Install Python**
   ```
   - Download from: https://www.python.org/downloads/
   - Install Python 3.8 or higher
   - Check "Add Python to PATH" during installation
   - Restart computer
   ```

2. **Verify Installation**
   ```
   - Open Command Prompt
   - Run: python --version
   - Should show version number
   ```

3. **Use Bundled Python**
   ```
   - If installer bundled Python, it should work automatically
   - Check: resources\python\python.exe exists
   ```

---

## ❌ Slow Performance

### Symptoms
- Application is slow
- High memory usage
- Long startup time

### Solutions

1. **Check System Resources**
   ```
   - Open Task Manager
   - Check CPU and Memory usage
   - Close other applications
   - Need at least 4GB RAM free
   ```

2. **Restart Application**
   ```
   - Close application completely
   - Wait 10 seconds
   - Restart application
   ```

3. **Clear Cache**
   ```
   - Close application
   - Delete: %APPDATA%\UCOST Discovery Hub\cache\
   - Restart application
   ```

---

## ❌ Installation Fails

### Symptoms
- Installer stops mid-way
- Error during installation
- Installation incomplete

### Solutions

1. **Check Disk Space**
   ```
   - Need at least 3GB free space
   - Free up disk space
   - Try installation again
   ```

2. **Run as Administrator**
   ```
   - Right-click installer
   - Select "Run as administrator"
   - Try installation again
   ```

3. **Disable Antivirus**
   ```
   - Temporarily disable antivirus
   - Run installer
   - Re-enable antivirus
   ```

---

## ❌ Recommendations Not Working

### Symptoms
- No recommendations shown
- "Service unavailable" errors
- Recommendations are empty

### Solutions

1. **Check Service Status**
   ```
   - Look at service status indicator
   - All services should be green
   - If red, check logs
   ```

2. **Restart Services**
   ```
   - Close application
   - Restart application
   - Wait for all services to start
   ```

3. **Check Internet Connection**
   ```
   - Some features require internet
   - Check connection
   - Try again
   ```

---

## ❌ Chatbot Not Responding

### Symptoms
- Chatbot doesn't answer
- "Service unavailable" message
- Timeout errors

### Solutions

1. **Check Chatbot Service**
   ```
   - Service should be on port 4321
   - Check service status
   - Restart if needed
   ```

2. **Check Backend Service**
   ```
   - Backend should be on port 5000
   - Chatbot depends on backend
   - Both must be running
   ```

3. **Check CSV Data**
   ```
   - File: resources\data\exhibits.csv
   - Should exist and be readable
   - Reinstall if missing
   ```

---

## 🔍 Diagnostic Information

### Generate Diagnostic Report

1. **From Application**
   ```
   - Help → Generate Diagnostic Report
   - Report saved to logs folder
   ```

2. **Manual Check**
   ```
   - Check logs folder
   - Review app.log
   - Review services.log
   ```

### System Information

```
- Windows Version: winver
- Python Version: python --version
- Node Version: node --version (if installed)
- Available Ports: netstat -ano
```

---

## 📞 Still Having Issues?

### Contact Support

- **Email:** support@ucost.uk.gov.in
- **Include:**
  - Error messages
  - Diagnostic report
  - Steps to reproduce
  - System information

### Useful Files

- **Logs:** `%APPDATA%\UCOST Discovery Hub\logs\`
- **Database:** `%APPDATA%\UCOST Discovery Hub\database.db`
- **Config:** `%APPDATA%\UCOST Discovery Hub\config.json`

---

**Last Updated:** December 2024

