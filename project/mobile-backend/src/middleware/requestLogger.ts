import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger';

const logger = new LoggerService();

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log the incoming request
  logger.info(`📥 ${req.method} ${req.url} - ${req.ip}`);
  
  // Log request completion when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 200 && status < 300 ? '✅' : 
                       status >= 400 && status < 500 ? '⚠️' : 
                       status >= 500 ? '❌' : 'ℹ️';
    
    logger.info(`${statusEmoji} ${req.method} ${req.url} - ${status} (${duration}ms)`);
  });
  
  next();
}; 