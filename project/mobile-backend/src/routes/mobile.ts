import express from 'express';
import { DatabaseService } from '../services/database';
import { LoggerService } from '../services/logger';

const router = express.Router();
const dbService = new DatabaseService();
const logger = new LoggerService();

// @route   GET /api/mobile/status
// @desc    Get mobile app status and backend health
// @access  Public
router.get('/status', async (req, res) => {
  try {
    const status = {
      backend: 'running',
      database: dbService.isConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Local SQLite Database',
        'User Authentication',
        'Exhibit Management',
        'File Uploads',
        'Caching System',
        'Analytics Tracking'
      ]
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Mobile status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking status'
    });
  }
});

export default router; 