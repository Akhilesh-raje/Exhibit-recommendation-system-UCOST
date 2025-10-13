# UCOST Discovery Hub - Mobile Backend

A **standalone, independent backend** for the UCOST Discovery Hub mobile application that works without external dependencies.

## 🚀 **Key Features**

### **Standalone Operation**
- ✅ **No external dependencies** - Works completely independently
- ✅ **Local SQLite database** - No need for external database servers
- ✅ **Built-in file storage** - Local file uploads and management
- ✅ **Self-contained** - Can be packaged with the mobile app

### **Mobile-Optimized**
- ✅ **RESTful API** - Optimized for mobile consumption
- ✅ **JWT Authentication** - Secure user management
- ✅ **File uploads** - Image handling for exhibits
- ✅ **Caching system** - Performance optimization
- ✅ **Rate limiting** - Security and stability

### **Full Functionality**
- ✅ **User Management** - Registration, login, profiles
- ✅ **Exhibit Management** - CRUD operations with images
- ✅ **Tour Management** - Exhibit tours and routes
- ✅ **Analytics** - User behavior tracking
- ✅ **OCR Processing** - Image text extraction (placeholder)
- ✅ **Admin Panel** - Full administrative control

## 🏗️ **Architecture**

```
mobile-backend/
├── src/
│   ├── server.ts          # Main server entry point
│   ├── services/          # Business logic services
│   │   ├── database.ts    # SQLite database operations
│   │   ├── logger.ts      # Logging service
│   │   └── cache.ts       # In-memory caching
│   ├── routes/            # API route handlers
│   │   ├── auth.ts        # Authentication routes
│   │   ├── exhibits.ts    # Exhibit management
│   │   ├── tours.ts       # Tour management
│   │   ├── analytics.ts   # Analytics tracking
│   │   ├── ocr.ts         # OCR processing
│   │   └── mobile.ts      # Mobile-specific endpoints
│   └── middleware/        # Express middleware
│       ├── auth.ts        # JWT authentication
│       ├── errorHandler.ts # Error handling
│       └── requestLogger.ts # Request logging
├── database/              # SQLite database files
├── uploads/               # File upload storage
├── logs/                  # Application logs
└── package.json           # Dependencies and scripts
```

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn

### **1. Install Dependencies**
```bash
cd project/mobile-backend
npm install
```

### **2. Build the Project**
```bash
npm run build
```

### **3. Start the Server**
```bash
npm start
```

### **4. Development Mode**
```bash
npm run dev
```

## 🔧 **Configuration**

### **Environment Variables**
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Logging
LOG_LEVEL=info

# Database (auto-configured)
# No external database needed!
```

### **Default Admin Account**
The system automatically creates a default admin account:
- **Username**: `admin`
- **Password**: `ucost@2025`

## 📱 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### **Exhibits**
- `GET /api/exhibits` - List all exhibits (with filtering)
- `GET /api/exhibits/:id` - Get specific exhibit
- `POST /api/exhibits` - Create new exhibit (admin only)
- `PUT /api/exhibits/:id` - Update exhibit (admin only)
- `DELETE /api/exhibits/:id` - Delete exhibit (admin only)

### **Tours**
- `GET /api/tours` - List all tours

### **Analytics**
- `GET /api/analytics` - Get analytics data

### **Mobile**
- `GET /api/mobile/status` - Backend status check

### **Health Check**
- `GET /health` - System health status

## 🗄️ **Database Schema**

### **Users Table**
- `id` - Unique identifier
- `username` - Username (unique)
- `email` - Email address (unique)
- `passwordHash` - Encrypted password
- `role` - User role (user/admin)
- `preferences` - JSON user preferences
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

### **Exhibits Table**
- `id` - Unique identifier
- `name` - Exhibit name
- `category` - Science category
- `location` - Physical location
- `description` - Detailed description
- `ageRange` - Target age group
- `type` - Exhibit type
- `environment` - Indoor/outdoor
- `features` - JSON array of features
- `images` - JSON array of image filenames
- `mapLocation` - JSON coordinates
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### **Tours Table**
- `id` - Unique identifier
- `name` - Tour name
- `description` - Tour description
- `exhibits` - JSON array of exhibit IDs
- `duration` - Tour duration in minutes
- `difficulty` - Tour difficulty level
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### **Analytics Table**
- `id` - Unique identifier
- `userId` - User ID (optional)
- `action` - Action performed
- `data` - JSON action data
- `timestamp` - Action timestamp

### **Sessions Table**
- `id` - Unique identifier
- `userId` - User ID
- `token` - JWT token
- `expiresAt` - Token expiration
- `createdAt` - Session creation

## 🔐 **Security Features**

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt encryption
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Request sanitization
- **CORS Protection** - Cross-origin security
- **Helmet Security** - HTTP header protection

## 📊 **Performance Features**

- **In-Memory Caching** - Fast response times
- **SQLite Optimization** - WAL mode, memory tables
- **Compression** - Gzip response compression
- **File Upload Limits** - Configurable size/type limits
- **Database Indexing** - Optimized queries

## 🚀 **Deployment**

### **Local Development**
```bash
npm run dev
```

### **Production Build**
```bash
npm run build:mobile
npm start
```

### **Mobile App Integration**
The backend is designed to run alongside the Capacitor mobile app:

1. **Build the backend**: `npm run build:mobile`
2. **Copy to mobile app**: Include the `dist/` folder in your mobile app
3. **Start backend**: The mobile app can start the backend process
4. **Connect**: Mobile app connects to `localhost:3000`

## 🔍 **Monitoring & Logging**

### **Log Files**
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only

### **Health Checks**
- `GET /health` - System status
- Database connectivity
- Cache status
- Service health

### **Analytics Tracking**
- User actions
- API usage
- Performance metrics
- Error tracking

## 🐛 **Troubleshooting**

### **Common Issues**

1. **Port Already in Use**
   ```bash
   # Change port in .env file
   PORT=3001
   ```

2. **Database Errors**
   ```bash
   # Rebuild database
   npm run setup:db
   ```

3. **Permission Errors**
   ```bash
   # Ensure write permissions for uploads/ and logs/ directories
   chmod 755 uploads/ logs/
   ```

### **Log Analysis**
```bash
# View real-time logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log
```

## 🔮 **Future Enhancements**

- [ ] **Real-time OCR** - Tesseract.js integration
- [ ] **Push Notifications** - Mobile push support
- [ ] **Offline Sync** - Data synchronization
- [ ] **Multi-language** - Internationalization
- [ ] **Advanced Analytics** - Detailed reporting
- [ ] **Backup System** - Data backup/restore

## 📄 **License**

MIT License - See LICENSE file for details

## 🤝 **Support**

For support and questions:
- Create an issue in the repository
- Contact the UCOST team
- Check the documentation

---

**Built with ❤️ for UCOST Discovery Hub** 