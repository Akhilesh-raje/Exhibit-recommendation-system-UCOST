import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import exhibitsRoutes from './routes/exhibits';
import toursRoutes from './routes/tours';
import analyticsRoutes from './routes/analytics';
import ocrRoutes from './routes/ocr';
import mobileRoutes from './routes/mobile';

// Import services
import { DatabaseService } from './services/database';
import { LoggerService } from './services/logger';
import { CacheService } from './services/cache';

// Import middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MobileBackendServer {
  private app: express.Application;
  private port: number;
  private logger: LoggerService;
  private dbService: DatabaseService;
  private cacheService: CacheService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.logger = new LoggerService();
    this.dbService = new DatabaseService();
    this.cacheService = new CacheService();
    
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database
      await this.dbService.initialize();
      this.logger.info('Database initialized successfully');

      // Initialize cache
      await this.cacheService.initialize();
      this.logger.info('Cache service initialized successfully');

      // Setup database tables if they don't exist
      await this.dbService.setupTables();
      this.logger.info('Database tables setup completed');

    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
    }));

    // CORS configuration for mobile app
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:8100', 'capacitor://localhost', 'ionic://localhost'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(morgan('combined', { stream: { write: (message) => this.logger.info(message.trim()) } }));
    this.app.use(requestLogger);

    // Static file serving
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use('/assets', express.static(path.join(__dirname, '../assets')));
    this.app.use('/database', express.static(path.join(__dirname, '../database')));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'UCOST Discovery Hub Mobile Backend',
        version: '1.0.0',
        database: this.dbService.isConnected() ? 'Connected' : 'Disconnected',
        cache: this.cacheService.isConnected() ? 'Connected' : 'Disconnected',
        endpoints: {
          auth: '/api/auth',
          exhibits: '/api/exhibits',
          tours: '/api/tours',
          analytics: '/api/analytics',
          ocr: '/api/ocr',
          mobile: '/api/mobile'
        }
      });
    });

    // API Routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/exhibits', exhibitsRoutes);
    this.app.use('/api/tours', toursRoutes);
    this.app.use('/api/analytics', analyticsRoutes);
    this.app.use('/api/ocr', ocrRoutes);
    this.app.use('/api/mobile', mobileRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'UCOST Discovery Hub Mobile Backend',
        version: '1.0.0',
        status: 'running',
        description: 'Standalone mobile backend - works independently without external dependencies',
        documentation: '/health',
        features: [
          'Local SQLite Database',
          'Built-in OCR Processing',
          'Offline Capability',
          'Mobile-Optimized APIs',
          'Local File Storage',
          'Caching System'
        ]
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
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
          '/api/mobile',
          '/health'
        ]
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      await this.app.listen(this.port, () => {
        this.logger.info(`🚀 UCOST Discovery Hub Mobile Backend running on port ${this.port}`);
        this.logger.info(`🔍 API Documentation: http://localhost:${this.port}/health`);
        this.logger.info(`📁 Uploads: http://localhost:${this.port}/uploads`);
        this.logger.info(`🗄️ Database: SQLite (Local)`);
        this.logger.info(`🔐 Auth: http://localhost:${this.port}/api/auth`);
        this.logger.info(`🏛️ Exhibits: http://localhost:${this.port}/api/exhibits`);
        this.logger.info(`🗺️ Tours: http://localhost:${this.port}/api/tours`);
        this.logger.info(`📊 Analytics: http://localhost:${this.port}/api/analytics`);
        this.logger.info(`🔍 OCR: http://localhost:${this.port}/api/ocr`);
        this.logger.info(`📱 Mobile: http://localhost:${this.port}/api/mobile`);
        this.logger.info(`💡 This backend works independently - no external dependencies required!`);
      });
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.dbService.close();
      await this.cacheService.close();
      this.logger.info('Server stopped gracefully');
    } catch (error) {
      this.logger.error('Error stopping server:', error);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  const server = new MobileBackendServer();
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  const server = new MobileBackendServer();
  await server.stop();
  process.exit(0);
});

// Start the server
const server = new MobileBackendServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default MobileBackendServer; 