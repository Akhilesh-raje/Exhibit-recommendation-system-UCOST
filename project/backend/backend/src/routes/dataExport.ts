import express, { Request, Response } from 'express';
import { DataStorageService } from '../services/dataStorage';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const dataStorageService = new DataStorageService();

// @route   GET /api/export/excel
// @desc    Download Excel data sheet for all exhibits
// @access  Private (Admin only)
router.get('/excel', [authenticateToken, requireAdmin], async (req: Request, res: Response) => {
  try {
    const { includeAnalytics = 'true', format = 'xlsx' } = req.query;
    
    const options = {
      includeAnalytics: includeAnalytics === 'true',
      format: format as 'xlsx' | 'csv'
    };

    const { buffer, filename } = await dataStorageService.generateExcelSheet(options);
    
    // Set response headers for file download
    res.setHeader('Content-Type', format === 'csv' 
      ? 'text/csv' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel sheet',
      error: error.message
    });
  }
});

// @route   POST /api/export/backup
// @desc    Create comprehensive data backup
// @access  Private (Admin only)
router.post('/backup', [authenticateToken, requireAdmin], async (req: Request, res: Response) => {
  try {
    const { includeImages = true, includeAnalytics = true, compress = true } = req.body;
    
    const backupPath = await dataStorageService.createDataBackup({
      includeImages,
      includeAnalytics,
      compress
    });
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backupPath: path.basename(backupPath),
      fullPath: backupPath
    });
  } catch (error: any) {
    console.error('Backup creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

// @route   GET /api/export/backup/:filename
// @desc    Download backup file
// @access  Private (Admin only)
router.get('/backup/:filename', [authenticateToken, requireAdmin], async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(process.cwd(), 'backups', filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }
    
    const stats = fs.statSync(backupPath);
    const fileStream = fs.createReadStream(backupPath);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Backup download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download backup',
      error: error.message
    });
  }
});

// @route   GET /api/export/backups
// @desc    Get list of available backups
// @access  Private (Admin only)
router.get('/backups', [authenticateToken, requireAdmin], async (_req: Request, res: Response) => {
  try {
    const stats = await dataStorageService.getBackupStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Backup stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get backup statistics',
      error: error.message
    });
  }
});

// @route   DELETE /api/export/backup/:filename
// @desc    Delete backup file
// @access  Private (Admin only)
router.delete('/backup/:filename', [authenticateToken, requireAdmin], async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(process.cwd(), 'backups', filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }
    
    fs.unlinkSync(backupPath);
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error: any) {
    console.error('Backup deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
});

// @route   POST /api/export/cleanup
// @desc    Clean up old backups
// @access  Private (Admin only)
router.post('/cleanup', [authenticateToken, requireAdmin], async (req: Request, res: Response) => {
  try {
    const { keepDays = 30 } = req.body;
    
    const deletedCount = await dataStorageService.cleanupOldBackups(keepDays);
    
    res.json({
      success: true,
      message: `Cleanup completed successfully`,
      deletedCount,
      keepDays
    });
  } catch (error: any) {
    console.error('Backup cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old backups',
      error: error.message
    });
  }
});

// @route   GET /api/export/stats
// @desc    Get export and backup statistics
// @access  Private (Admin only)
router.get('/stats', [authenticateToken, requireAdmin], async (_req: Request, res: Response) => {
  try {
    const backupStats = await dataStorageService.getBackupStats();
    
    // Get disk usage information
    const backupDir = path.join(process.cwd(), 'backups');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    const getDirSize = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      
      let size = 0;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          size += getDirSize(fullPath);
        } else {
          size += fs.statSync(fullPath).size;
        }
      }
      return size;
    };
    
    const backupSize = getDirSize(backupDir);
    const uploadsSize = getDirSize(uploadsDir);
    
    const stats = {
      backup: backupStats,
      storage: {
        backup: `${(backupSize / (1024 * 1024)).toFixed(2)} MB`,
        uploads: `${(uploadsSize / (1024 * 1024)).toFixed(2)} MB`,
        total: `${((backupSize + uploadsSize) / (1024 * 1024)).toFixed(2)} MB`
      },
      lastExport: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Export stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get export statistics',
      error: error.message
    });
  }
});

export default router; 