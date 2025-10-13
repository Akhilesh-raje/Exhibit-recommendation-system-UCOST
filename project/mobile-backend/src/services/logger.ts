import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logDir = path.join(__dirname, '../../logs');
    
    // Create logs directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'mobile-backend' },
      transports: [
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
    });

    // If we're not in production, log to the console with colors
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  public silly(message: string, meta?: any): void {
    this.logger.silly(message, meta);
  }

  // Log with context
  public logWithContext(level: string, message: string, context: any): void {
    this.logger.log(level, message, { context });
  }

  // Log API requests
  public logRequest(method: string, url: string, statusCode: number, responseTime: number): void {
    this.logger.info('API Request', {
      method,
      url,
      statusCode,
      responseTime: `${responseTime}ms`
    });
  }

  // Log database operations
  public logDatabase(operation: string, table: string, duration: number): void {
    this.logger.debug('Database Operation', {
      operation,
      table,
      duration: `${duration}ms`
    });
  }

  // Log file operations
  public logFile(operation: string, filename: string, size?: number): void {
    this.logger.info('File Operation', {
      operation,
      filename,
      size: size ? `${size} bytes` : undefined
    });
  }

  // Log authentication events
  public logAuth(event: string, userId?: string, success: boolean = true): void {
    this.logger.info('Authentication Event', {
      event,
      userId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  // Log security events
  public logSecurity(event: string, details: any): void {
    this.logger.warn('Security Event', {
      event,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent
    });
  }

  // Log performance metrics
  public logPerformance(operation: string, duration: number, metadata?: any): void {
    this.logger.info('Performance Metric', {
      operation,
      duration: `${duration}ms`,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Get logger instance
  public getLogger(): winston.Logger {
    return this.logger;
  }
} 