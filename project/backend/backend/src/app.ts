import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Load environment variables early and ensure DATABASE_URL defaults to local SQLite
dotenv.config();
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  const defaultDbPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}

// Import all route modules
import authRoutes from './routes/auth';
import exhibitsRoutes from './routes/exhibits';
import toursRoutes from './routes/tours';
import analyticsRoutes from './routes/analytics';
import ocrRoutes from './routes/ocr';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exhibits', exhibitsRoutes);
app.use('/api/tours', toursRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ocr', ocrRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'UCOST Discovery Hub Backend',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      exhibits: '/api/exhibits',
      tours: '/api/tours',
      analytics: '/api/analytics',
      ocr: '/api/ocr',
      export: '/api/export'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UCOST Discovery Hub Backend API',
    version: '1.0.0',
    status: 'running',
    documentation: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      '/api/auth',
      '/api/exhibits', 
      '/api/tours',
      '/api/analytics',
      '/api/ocr',
      '/health'
    ]
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UCOST Discovery Hub Backend running on port ${PORT}`);
  console.log(`🔍 API Documentation: http://localhost:${PORT}/health`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`🏛️ Exhibits: http://localhost:${PORT}/api/exhibits`);
  console.log(`🗺️ Tours: http://localhost:${PORT}/api/tours`);
  console.log(`📊 Analytics: http://localhost:${PORT}/api/analytics`);
  console.log(`🔍 OCR: http://localhost:${PORT}/api/ocr`);
});

export default app; 