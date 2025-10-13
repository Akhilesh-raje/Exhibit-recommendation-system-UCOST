import express from 'express';
import multer from 'multer';
import path from 'path';
import { body, validationResult, query } from 'express-validator';
import { DatabaseService } from '../services/database';
import { LoggerService } from '../services/logger';
import { authMiddleware, requireAdmin, requireUserOrAdmin } from '../middleware/auth';
import { CacheService } from '../services/cache';

const router = express.Router();
const dbService = new DatabaseService();
const logger = new LoggerService();
const cacheService = new CacheService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/exhibits');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `exhibit-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Validation middleware
const validateExhibit = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('category').isIn(['physics', 'chemistry', 'biology', 'astronomy', 'technology', 'mathematics']).withMessage('Invalid category'),
  body('location').trim().isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('ageRange').optional().isIn(['kids', 'students', 'families', 'researchers']).withMessage('Invalid age range'),
  body('type').optional().isIn(['interactive', 'passive', 'hands-on']).withMessage('Invalid type'),
  body('environment').optional().isIn(['indoor', 'outdoor', 'both']).withMessage('Invalid environment'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('mapLocation').optional().isObject().withMessage('Map location must be an object')
];

const validateExhibitUpdate = [
  body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
  body('category').optional().isIn(['physics', 'chemistry', 'biology', 'astronomy', 'technology', 'mathematics']).withMessage('Invalid category'),
  body('location').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('ageRange').optional().isIn(['kids', 'students', 'families', 'researchers']).withMessage('Invalid age range'),
  body('type').optional().isIn(['interactive', 'passive', 'hands-on']).withMessage('Invalid type'),
  body('environment').optional().isIn(['indoor', 'outdoor', 'both']).withMessage('Invalid environment'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('mapLocation').optional().isObject().withMessage('Map location must be an object')
];

// @route   GET /api/exhibits
// @desc    Get all exhibits with optional filtering
// @access  Public
router.get('/', [
  query('category').optional().isIn(['physics', 'chemistry', 'biology', 'astronomy', 'technology', 'mathematics']),
  query('ageRange').optional().isIn(['kids', 'students', 'families', 'researchers']),
  query('type').optional().isIn(['interactive', 'passive', 'hands-on']),
  query('environment').optional().isIn(['indoor', 'outdoor', 'both']),
  query('search').optional().trim().isLength({ min: 2 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 })
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

    const {
      category,
      ageRange,
      type,
      environment,
      search,
      limit = 20,
      page = 1
    } = req.query;

    // Try to get from cache first
    const cacheKey = `exhibits:${JSON.stringify(req.query)}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.debug('Exhibits served from cache');
      return res.json(cached);
    }

    // Get all exhibits from database
    let exhibits = await dbService.getAllExhibits();

    // Apply filters
    if (category) {
      exhibits = exhibits.filter(exhibit => exhibit.category === category);
    }

    if (ageRange) {
      exhibits = exhibits.filter(exhibit => exhibit.ageRange === ageRange);
    }

    if (type) {
      exhibits = exhibits.filter(exhibit => exhibit.type === type);
    }

    if (environment) {
      exhibits = exhibits.filter(exhibit => exhibit.environment === environment);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      exhibits = exhibits.filter(exhibit =>
        exhibit.name.toLowerCase().includes(searchLower) ||
        exhibit.description.toLowerCase().includes(searchLower) ||
        exhibit.location.toLowerCase().includes(searchLower)
      );
    }

    // Calculate pagination
    const total = exhibits.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedExhibits = exhibits.slice(startIndex, endIndex);

    // Log analytics
    await dbService.logAnalytics(req.user?.id || null, 'exhibits_viewed', {
      filters: { category, ageRange, type, environment, search },
      pagination: { page, limit },
      totalResults: total,
      timestamp: new Date().toISOString()
    });

    const result = {
      success: true,
      data: paginatedExhibits,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    };

    // Cache the result for 5 minutes
    cacheService.set(cacheKey, result, 5 * 60 * 1000);

    res.json(result);

  } catch (error) {
    logger.error('Get exhibits error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exhibits'
    });
  }
});

// @route   GET /api/exhibits/:id
// @desc    Get exhibit by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get from cache first
    const cacheKey = `exhibit:${id}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.debug(`Exhibit ${id} served from cache`);
      return res.json(cached);
    }

    const exhibit = await dbService.getExhibitById(id);
    
    if (!exhibit) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found'
      });
    }

    // Log analytics
    await dbService.logAnalytics(req.user?.id || null, 'exhibit_viewed', {
      exhibitId: id,
      exhibitName: exhibit.name,
      timestamp: new Date().toISOString()
    });

    const result = {
      success: true,
      data: exhibit
    };

    // Cache the result for 10 minutes
    cacheService.set(cacheKey, result, 10 * 60 * 1000);

    res.json(result);

  } catch (error) {
    logger.error('Get exhibit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exhibit'
    });
  }
});

// @route   POST /api/exhibits
// @desc    Create a new exhibit
// @access  Private (Admin only)
router.post('/', [
  authMiddleware,
  requireAdmin,
  ...validateExhibit
], upload.array('images', 5), async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      name,
      category,
      location,
      description,
      ageRange,
      type,
      environment,
      features,
      mapLocation
    } = req.body;

    // Process uploaded images
    const images = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];

    // Create exhibit data
    const exhibitData = {
      name,
      category,
      location,
      description: description || '',
      ageRange: ageRange || 'families',
      type: type || 'passive',
      environment: environment || 'indoor',
      features: features ? JSON.stringify(features) : JSON.stringify([]),
      images: JSON.stringify(images),
      mapLocation: mapLocation ? JSON.stringify(mapLocation) : JSON.stringify({})
    };

    // Create exhibit in database
    const newExhibit = await dbService.createExhibit(exhibitData);

    // Log analytics
    await dbService.logAnalytics(req.user!.id, 'exhibit_created', {
      exhibitId: newExhibit.id,
      exhibitName: newExhibit.name,
      category: newExhibit.category,
      timestamp: new Date().toISOString()
    });

    // Clear related caches
    cacheService.deletePattern('exhibits:.*');
    cacheService.deletePattern('exhibit:.*');

    // Log file operations
    if (images.length > 0) {
      logger.logFile('exhibit_images_uploaded', images.join(', '), images.length);
    }

    res.status(201).json({
      success: true,
      message: 'Exhibit created successfully',
      data: newExhibit
    });

  } catch (error) {
    logger.error('Create exhibit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating exhibit'
    });
  }
});

// @route   PUT /api/exhibits/:id
// @desc    Update an exhibit
// @access  Private (Admin only)
router.put('/:id', [
  authMiddleware,
  requireAdmin,
  ...validateExhibitUpdate
], upload.array('images', 5), async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData: any = { ...req.body };

    // Process uploaded images if any
    if (req.files && req.files.length > 0) {
      const newImages = (req.files as Express.Multer.File[]).map(file => file.filename);
      updateData.images = JSON.stringify(newImages);
      
      // Log file operations
      logger.logFile('exhibit_images_updated', newImages.join(', '), newImages.length);
    }

    // Update exhibit in database
    const updatedExhibit = await dbService.updateExhibit(id, updateData);
    
    if (!updatedExhibit) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found'
      });
    }

    // Log analytics
    await dbService.logAnalytics(req.user!.id, 'exhibit_updated', {
      exhibitId: id,
      exhibitName: updatedExhibit.name,
      updatedFields: Object.keys(updateData),
      timestamp: new Date().toISOString()
    });

    // Clear related caches
    cacheService.deletePattern('exhibits:.*');
    cacheService.delete(`exhibit:${id}`);

    res.json({
      success: true,
      message: 'Exhibit updated successfully',
      data: updatedExhibit
    });

  } catch (error) {
    logger.error('Update exhibit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating exhibit'
    });
  }
});

// @route   DELETE /api/exhibits/:id
// @desc    Delete an exhibit
// @access  Private (Admin only)
router.delete('/:id', [authMiddleware, requireAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    // Get exhibit before deletion for logging
    const exhibit = await dbService.getExhibitById(id);
    if (!exhibit) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found'
      });
    }

    // Delete exhibit from database
    const deleted = await dbService.deleteExhibit(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Exhibit not found'
      });
    }

    // Log analytics
    await dbService.logAnalytics(req.user!.id, 'exhibit_deleted', {
      exhibitId: id,
      exhibitName: exhibit.name,
      timestamp: new Date().toISOString()
    });

    // Clear related caches
    cacheService.deletePattern('exhibits:.*');
    cacheService.delete(`exhibit:${id}`);

    res.json({
      success: true,
      message: 'Exhibit deleted successfully'
    });

  } catch (error) {
    logger.error('Delete exhibit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting exhibit'
    });
  }
});

// @route   GET /api/exhibits/categories/all
// @desc    Get all available categories
// @access  Public
router.get('/categories/all', async (req, res) => {
  try {
    const categories = [
      { id: 'physics', name: 'Physics', description: 'Physical sciences and mechanics' },
      { id: 'chemistry', name: 'Chemistry', description: 'Chemical reactions and materials' },
      { id: 'biology', name: 'Biology', description: 'Life sciences and living organisms' },
      { id: 'astronomy', name: 'Astronomy', description: 'Space, stars, and celestial bodies' },
      { id: 'technology', name: 'Technology', description: 'Modern technology and innovation' },
      { id: 'mathematics', name: 'Mathematics', description: 'Numbers, patterns, and logic' }
    ];

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

// @route   GET /api/exhibits/stats/overview
// @desc    Get exhibit statistics overview
// @access  Private (Admin only)
router.get('/stats/overview', [authMiddleware, requireAdmin], async (req, res) => {
  try {
    const exhibits = await dbService.getAllExhibits();
    
    // Calculate statistics
    const stats = {
      total: exhibits.length,
      byCategory: {} as { [key: string]: number },
      byAgeRange: {} as { [key: string]: number },
      byType: {} as { [key: string]: number },
      byEnvironment: {} as { [key: string]: number },
      recentAdditions: exhibits
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(exhibit => ({
          id: exhibit.id,
          name: exhibit.name,
          category: exhibit.category,
          createdAt: exhibit.createdAt
        }))
    };

    // Count by category
    exhibits.forEach(exhibit => {
      stats.byCategory[exhibit.category] = (stats.byCategory[exhibit.category] || 0) + 1;
      stats.byAgeRange[exhibit.ageRange] = (stats.byAgeRange[exhibit.ageRange] || 0) + 1;
      stats.byType[exhibit.type] = (stats.byType[exhibit.type] || 0) + 1;
      stats.byEnvironment[exhibit.environment] = (stats.byEnvironment[exhibit.environment] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get exhibit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching exhibit statistics'
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed.'
    });
  }

  next(error);
});

export default router; 