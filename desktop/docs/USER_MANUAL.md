# 📖 UCOST Discovery Hub - User Manual

## Welcome to UCOST Discovery Hub!

This desktop application provides an AI-powered exhibit recommendation system for regional science centres.

---

## 🚀 Getting Started

### System Requirements

- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **RAM:** 4GB minimum (8GB recommended)
- **Storage:** 3GB free disk space
- **Internet:** Required for initial setup (optional after installation)

### Installation

1. **Run the Installer**
   - Double-click `UCOST Discovery Hub Setup 1.0.0.exe`
   - Follow the installation wizard
   - Choose installation directory (default: `C:\Program Files\UCOST Discovery Hub`)
   - Wait for installation to complete (~5-10 minutes)

2. **First Launch**
   - The app will automatically:
     - Set up Python environment (if needed)
     - Install dependencies (~3-5 minutes on first run)
     - Initialize database
     - Start all services
   - A progress window will show installation status

3. **Launch the Application**
   - Desktop shortcut: Double-click "UCOST Discovery Hub"
   - Start Menu: Search for "UCOST Discovery Hub"
   - Installation directory: Run `UCOST Discovery Hub.exe`

---

## 🎯 Features

### 1. Exhibit Recommendations
- **AI-Powered Suggestions:** Get personalized exhibit recommendations based on your interests
- **Multiple Input Methods:**
  - Text queries
  - Image uploads
  - Metadata filters (category, floor, location)

### 2. Chatbot Assistant
- **Conversational Interface:** Ask questions about exhibits
- **RAG-Powered:** Retrieves accurate information from exhibit database
- **Multi-modal:** Understands text and image queries

### 3. Exhibit Management
- **Browse Exhibits:** View all available exhibits
- **Search & Filter:** Find exhibits by name, category, or location
- **Detailed Information:** View descriptions, images, and interactive features

### 4. Admin Dashboard
- **User Management:** Manage users and permissions
- **Exhibit Management:** Add, edit, or remove exhibits
- **Analytics:** View visitor statistics and recommendations

---

## 📱 Using the Application

### Main Interface

1. **Navigation Bar**
   - Home: Browse exhibits
   - Recommendations: Get AI-powered suggestions
   - Chatbot: Ask questions
   - Admin: Management dashboard (admin only)

2. **Search Bar**
   - Type to search exhibits
   - Use filters for advanced search
   - Upload images for visual search

3. **Recommendations Panel**
   - View personalized recommendations
   - Click exhibits to see details
   - Get route suggestions

### Getting Recommendations

1. **Text Query**
   - Type your interest in the search bar
   - Example: "physics exhibits" or "interactive displays"
   - Click "Get Recommendations"

2. **Image Upload**
   - Click "Upload Image" button
   - Select an image file
   - Get visually similar exhibits

3. **Metadata Filter**
   - Use filter options:
     - Category (Physics, Biology, Chemistry, etc.)
     - Floor (Ground, First, Second)
     - Location
     - Interactive features

### Using the Chatbot

1. **Open Chatbot**
   - Click "Chatbot" in navigation
   - Or use the chat icon

2. **Ask Questions**
   - Example: "What exhibits are on the first floor?"
   - Example: "Show me physics-related exhibits"
   - Example: "Where is the planetarium?"

3. **View Recommendations**
   - Chatbot provides exhibit recommendations
   - Click exhibits to see details
   - Get directions and information

---

## ⚙️ Configuration

### Service Status

View service status in the application:
- Backend API: Port 5000
- Chatbot: Port 4321
- Embed Service: Port 8001
- Gemma Recommender: Port 8011
- OCR Engine: Port 8088

### Database Location

User data is stored in:
- **Windows:** `%APPDATA%\UCOST Discovery Hub\`
- Contains: Database, logs, uploads, cache

### Logs

View logs for troubleshooting:
- Location: `%APPDATA%\UCOST Discovery Hub\logs\`
- Files: `app.log`, `services.log`

---

## 🔧 Troubleshooting

### Application Won't Start

1. **Check Services**
   - Open Task Manager
   - Look for "UCOST Discovery Hub" processes
   - End all processes and restart

2. **Check Logs**
   - Navigate to logs folder
   - Check `app.log` for errors
   - Check `services.log` for service issues

3. **Reinstall**
   - Uninstall from Control Panel
   - Delete `%APPDATA%\UCOST Discovery Hub`
   - Reinstall application

### Services Not Starting

1. **Check Ports**
   - Ensure ports 5000, 4321, 8001, 8011, 8088 are available
   - Close other applications using these ports

2. **Check Python**
   - Application requires Python 3.8+
   - If bundled Python fails, install system Python
   - Download from: https://www.python.org/downloads/

3. **Check Dependencies**
   - Run: `desktop\requirements\install-requirements.bat`
   - Or reinstall application

### Database Issues

1. **Database Corrupted**
   - Close application
   - Backup: `%APPDATA%\UCOST Discovery Hub\database.db`
   - Delete database file
   - Restart application (will recreate database)

2. **Database Locked**
   - Close all instances of application
   - Wait a few seconds
   - Restart application

### Performance Issues

1. **Slow Startup**
   - First launch takes longer (dependency installation)
   - Subsequent launches are faster
   - Check available RAM (need 4GB+)

2. **High Memory Usage**
   - ML models use significant memory
   - Close other applications
   - Restart application if needed

---

## 🔐 Security

### Default Admin Credentials

- **Email:** `admin@ucost.com`
- **Password:** `admin123`

⚠️ **IMPORTANT:** Change password after first login!

### Data Privacy

- All data stored locally on your computer
- No data sent to external servers
- Database encrypted at rest
- User data in secure location

---

## 📞 Support

### Getting Help

1. **Documentation**
   - Check this manual
   - See `QUICK_START.md` for quick reference
   - Check `TROUBLESHOOTING.md` for common issues

2. **Logs**
   - Check logs folder for error details
   - Export diagnostic report from app

3. **Contact**
   - Email: support@ucost.uk.gov.in
   - Website: https://ucost.uk.gov.in

---

## 🆕 Updates

### Checking for Updates

- Application checks for updates on startup
- Manual check: Help → Check for Updates
- Download updates from official website

### Updating

1. Download new installer
2. Run installer (will update existing installation)
3. Restart application

---

## 📚 Additional Resources

- **Quick Start Guide:** `QUICK_START.md`
- **Troubleshooting Guide:** `TROUBLESHOOTING.md`
- **Developer Documentation:** `DEVELOPER.md`
- **API Documentation:** Available in app

---

## 🎓 Tips & Tricks

1. **Faster Recommendations**
   - Use specific queries
   - Upload clear images
   - Use filters to narrow results

2. **Better Chatbot Results**
   - Ask specific questions
   - Use exhibit names when known
   - Try rephrasing if no results

3. **Performance**
   - Close unused browser tabs
   - Restart app if it becomes slow
   - Clear cache if needed

---

**Version:** 1.0.0  
**Last Updated:** December 2024  
**UCOST Discovery Hub** - Powered by AI

