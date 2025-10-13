import express from 'express';
import { DatabaseService } from '../services/database';
import { LoggerService } from '../services/logger';

const router = express.Router();
const dbService = new DatabaseService();
const logger = new LoggerService();

// @route   GET /api/analytics
// @desc    Get analytics data
// @access  Public
router.get('/', async (req, res) => {
  try {
    const analytics = await dbService.getAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

export default router; 