import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../services/logger';

const logger = new LoggerService();

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  // Log the error
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: isDevelopment ? err.errors : 'Invalid input data'
    });
  } else if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: 'File upload error',
      details: isDevelopment ? err.message : 'File upload failed'
    });
  } else if (err.code === 'ENOENT') {
    res.status(404).json({
      success: false,
      message: 'Resource not found'
    });
  } else if (err.code === 'EACCES') {
    res.status(403).json({
      success: false,
      message: 'Permission denied'
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: isDevelopment ? err.message : 'Something went wrong'
    });
  }
}; 