# UCost Discovery Hub - Backend API

> The consolidated overview is maintained in the root `README.md` (**Subsystem Guides → Backend API**). Use this file for API-specific setup details.

Backend API for the UCost Discovery Hub science museum kiosk system.

## ✅ **Status: 100% Complete & Working**

**All API endpoints are operational and tested.**

## 🚀 Features

- **Exhibit Management**: CRUD operations for science exhibits
- **User Profiles**: Visitor onboarding and preferences
- **Tour System**: Personalized exhibit tours
- **Admin Panel**: Secure admin authentication and management
- **Analytics**: Visitor tracking and statistics
- **File Upload**: Image upload for exhibits
- **Map Integration**: Floor-based exhibit placement

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Logging**: Morgan

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/ucost_db"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Frontend URL
FRONTEND_URL=http://localhost:8080
```

### 3. Database Setup

Generate Prisma client:
```bash
npm run db:generate
```

Push database schema:
```bash
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login (returns JWT token)
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Logout (invalidates token)

### Exhibits
- `GET /api/exhibits` - List all exhibits (supports filtering, pagination)
- `GET /api/exhibits/:id` - Get exhibit details by ID
- `POST /api/exhibits` - Create new exhibit (admin only, supports image upload)
- `PUT /api/exhibits/:id` - Update exhibit (admin only)
- `DELETE /api/exhibits/:id` - Delete exhibit (admin only)
- `GET /api/exhibits/search` - Search exhibits by query

### Users
- `POST /api/users/profile` - Save/update user profile
- `GET /api/users/profile/:email` - Get user profile by email
- `GET /api/users/:userId/tours` - Get all tours for a user
- `GET /api/users` - List all users (admin only)

### Tours
- `POST /api/tours` - Create new tour
- `GET /api/tours` - List all tours
- `GET /api/tours/:id` - Get tour details
- `PUT /api/tours/:id` - Update tour
- `DELETE /api/tours/:id` - Delete tour
- `POST /api/tours/:id/exhibits` - Add exhibit to tour
- `DELETE /api/tours/:id/exhibits/:exhibitId` - Remove exhibit from tour

### Analytics
- `POST /api/analytics/track` - Track visitor activity/event
- `GET /api/analytics/visitors` - Get visitor statistics
- `GET /api/analytics/popular-exhibits` - Get most popular exhibits
- `GET /api/analytics/page-stats` - Get page visit statistics
- `GET /api/analytics/daily-trends` - Get daily visitor trends
- `GET /api/analytics/summary` - Get analytics summary dashboard

### OCR
- `POST /api/ocr/process` - Process image for text extraction
- `POST /api/ocr/batch` - Batch process multiple images
- `GET /api/ocr/status/:jobId` - Get OCR job status

### Data Export
- `GET /api/export/excel` - Export exhibits to Excel/CSV
- `POST /api/export/backup` - Create full system backup
- `GET /api/export/backups` - List all backups
- `GET /api/export/backup/:filename` - Download specific backup
- `DELETE /api/export/backup/:filename` - Delete backup
- `POST /api/export/cleanup` - Cleanup old backups
- `GET /api/export/stats` - Get export statistics

### Health & Info
- `GET /health` - Service health check and API information
- `GET /` - Root endpoint with API overview

## 🗄️ Database Schema

### Core Models (Prisma)

- **User**: Visitor profiles and preferences
  - Profile information, age group, interests, learning style
  - Onboarding data and preferences
  
- **AdminUser**: System administrators
  - Authentication credentials, roles, permissions
  
- **Exhibit**: Science exhibits with comprehensive metadata
  - Basic info (name, description, category)
  - Location data (floor, coordinates, map location)
  - Media (images, videos)
  - Metadata (age range, type, environment, features)
  - Analytics (visitor count, average time, rating)
  - Route instructions and accessibility info
  
- **Tour**: User-created exhibit collections
  - Tour name, description, duration
  - User association and metadata
  
- **TourExhibit**: Junction table for tour-exhibit relationships
  - Links tours to exhibits with ordering
  
- **VisitorAnalytics**: Visitor activity tracking
  - Page visits, exhibit interactions
  - Time spent, navigation patterns
  - User behavior data for AI recommendations

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Security headers with Helmet
- File upload validation
- Input sanitization

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── app.ts           # Main application
├── prisma/
│   └── schema.prisma    # Database schema
├── uploads/             # File storage
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Ensure all required environment variables are set in production.

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add proper error handling
3. Include input validation
4. Write clear documentation
5. Test all endpoints

## 📞 Support

For questions or issues, contact the UCost development team.

---

**UCost Discovery Hub Backend** - Powering the future of interactive science education 