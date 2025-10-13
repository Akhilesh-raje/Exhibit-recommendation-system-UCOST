import express from 'express';
import { DatabaseService } from '../services/database';
import { LoggerService } from '../services/logger';

const router = express.Router();
const dbService = new DatabaseService();
const logger = new LoggerService();

// @route   GET /api/tours
// @desc    Get all tours
// @access  Public
router.get('/', async (req, res) => {
  try {
    const tours = await dbService.getAllTours();
    
    res.json({
      success: true,
      data: tours
    });
  } catch (error) {
    logger.error('Get tours error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tours'
    });
  }
});

export default router; 