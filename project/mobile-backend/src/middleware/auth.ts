import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';
import { LoggerService } from '../services/logger';

const dbService = new DatabaseService();
const logger = new LoggerService();

// JWT secret - should match the one in auth routes
const JWT_SECRET = process.env.JWT_SECRET || 'ucost-discovery-hub-mobile-secret-key-2025';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      logger.logSecurity('auth_missing_token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    // Check if token format is correct
    if (!authHeader.startsWith('Bearer ')) {
      logger.logSecurity('auth_invalid_token_format', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        tokenFormat: authHeader.substring(0, 20) + '...'
      });
      
      res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      logger.logSecurity('auth_empty_token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      
      res.status(401).json({
        success: false,
        message: 'Access denied. Empty token.'
      });
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (!decoded.user || !decoded.user.id) {
        logger.logSecurity('auth_invalid_token_payload', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method
        });
        
        res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token payload.'
        });
        return;
      }

      // Check if session exists and is valid
      const session = await dbService.getSessionByToken(token);
      if (!session) {
        logger.logSecurity('auth_session_not_found', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          userId: decoded.user.id
        });
        
        res.status(401).json({
          success: false,
          message: 'Access denied. Session not found.'
        });
        return;
      }

      // Check if session has expired
      if (new Date(session.expiresAt) < new Date()) {
        // Clean up expired session
        await dbService.deleteSession(token);
        
        logger.logSecurity('auth_session_expired', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          userId: decoded.user.id
        });
        
        res.status(401).json({
          success: false,
          message: 'Access denied. Session expired.'
        });
        return;
      }

      // Verify user still exists
      const user = await dbService.getUserById(decoded.user.id);
      if (!user) {
        logger.logSecurity('auth_user_not_found', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          userId: decoded.user.id
        });
        
        // Clean up invalid session
        await dbService.deleteSession(token);
        
        res.status(401).json({
          success: false,
          message: 'Access denied. User not found.'
        });
        return;
      }

      // Check if user is active (you can add more checks here)
      if (user.role === 'banned' || user.role === 'suspended') {
        logger.logSecurity('auth_user_inactive', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          userId: decoded.user.id,
          role: user.role
        });
        
        res.status(403).json({
          success: false,
          message: 'Access denied. User account is not active.'
        });
        return;
      }

      // Add user info to request
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      // Log successful authentication
      logger.logAuth('auth_success', user.id, true);

      // Continue to next middleware/route
      next();

    } catch (error) {
      const jwtError = error as Error;
      res.status(401).json({
        success: false,
        error: jwtError.message
      });
      return;
    }

  } catch (error) {
    logger.error('Auth middleware error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Optional authentication middleware - doesn't fail if no token
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.user && decoded.user.id) {
        // Check session validity
        const session = await dbService.getSessionByToken(token);
        if (session && new Date(session.expiresAt) > new Date()) {
          const user = await dbService.getUserById(decoded.user.id);
          if (user && user.role !== 'banned' && user.role !== 'suspended') {
            req.user = {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role
            };
          }
        }
      }
    } catch (error) {
      // Token is invalid, but we continue without authentication
      logger.debug('Optional auth failed, continuing without user:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

// Role-based access control middleware
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Authentication required.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.logSecurity('auth_insufficient_role', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
      
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
      return;
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole('admin');

// User or admin middleware
export const requireUserOrAdmin = requireRole(['user', 'admin']);

// Rate limiting middleware for authentication endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.logSecurity('auth_rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.'
    });
  }
}; 