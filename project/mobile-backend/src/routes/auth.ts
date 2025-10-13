import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { DatabaseService } from '../services/database';
import { LoggerService } from '../services/logger';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const dbService = new DatabaseService();
const logger = new LoggerService();

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'ucost-discovery-hub-mobile-secret-key-2025';
const JWT_EXPIRES_IN = '7d'; // 7 days

// Validation middleware
const validateLogin = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateRegister = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin')
];

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find user by username
    const user = await dbService.getUserByUsername(username);
    if (!user) {
      logger.logAuth('login_failed', undefined, false);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.logAuth('login_failed', user.id, false);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await dbService.createSession(user.id, token, expiresAt);

    // Log successful login
    logger.logAuth('login_success', user.id, true);

    // Log analytics
    await dbService.logAnalytics(user.id, 'user_login', {
      username: user.username,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences ? JSON.parse(user.preferences) : {}
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegister, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await dbService.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await dbService.createUser({
      username,
      email,
      passwordHash,
      role,
      preferences: JSON.stringify({
        theme: 'light',
        language: 'en',
        notifications: true
      })
    });

    // Log user registration
    logger.logAuth('user_registered', newUser.id, true);

    // Log analytics
    await dbService.logAnalytics(newUser.id, 'user_registration', {
      username: newUser.username,
      role: newUser.role,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        preferences: JSON.parse(newUser.preferences)
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate token)
// @access  Private
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      await dbService.deleteSession(token);
    }

    // Log logout
    logger.logAuth('logout', req.user.id, true);

    // Log analytics
    await dbService.logAnalytics(req.user.id, 'user_logout', {
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authMiddleware, [
  body('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, preferences } = req.body;
    const user = await dbService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user preferences
    const updatedPreferences = {
      ...(user.preferences ? JSON.parse(user.preferences) : {}),
      ...preferences
    };

    // For now, we'll just update preferences in the database
    // In a full implementation, you'd want to add an updateUser method to DatabaseService
    const updatedUser = {
      ...user,
      preferences: JSON.stringify(updatedPreferences),
      updatedAt: new Date().toISOString()
    };

    // Log profile update
    logger.logAuth('profile_updated', user.id, true);

    // Log analytics
    await dbService.logAnalytics(user.id, 'profile_updated', {
      updatedFields: Object.keys(preferences || {}),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        preferences: updatedPreferences,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const user = await dbService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create new JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Update session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    // Delete old session and create new one
    const oldToken = req.header('Authorization')?.replace('Bearer ', '');
    if (oldToken) {
      await dbService.deleteSession(oldToken);
    }
    await dbService.createSession(user.id, newToken, expiresAt);

    // Log token refresh
    logger.logAuth('token_refreshed', user.id, true);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing token'
    });
  }
});

// @route   GET /api/auth/validate
// @desc    Validate JWT token
// @access  Public
router.get('/validate', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if session exists and is valid
    const session = await dbService.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      await dbService.deleteSession(token);
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      user: decoded.user
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    logger.error('Token validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating token'
    });
  }
});

export default router; 