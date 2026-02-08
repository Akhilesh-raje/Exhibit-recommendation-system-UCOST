/**
 * Log Rotator
 * Manages log file rotation to prevent disk space issues
 */

const fs = require('fs');
const path = require('path');

class LogRotator {
  constructor(logsPath, options = {}) {
    this.logsPath = logsPath;
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10 MB default
    this.maxFiles = options.maxFiles || 30; // Keep 30 days of logs
    this.compressOldLogs = options.compressOldLogs || false;
  }

  /**
   * Rotate log file if it exceeds max size
   */
  rotateIfNeeded(logFile) {
    try {
      if (!fs.existsSync(logFile)) {
        return;
      }

      const stats = fs.statSync(logFile);
      
      if (stats.size > this.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        
        // Rename current log to rotated file
        fs.renameSync(logFile, rotatedFile);
        
        // Compress if enabled
        if (this.compressOldLogs) {
          this.compressLog(rotatedFile);
        }
      }
    } catch (error) {
      console.error('Log rotation error:', error.message);
    }
  }

  /**
   * Clean up old log files
   */
  cleanupOldLogs() {
    try {
      if (!fs.existsSync(this.logsPath)) {
        return;
      }

      const files = fs.readdirSync(this.logsPath)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logsPath, file),
          mtime: fs.statSync(path.join(this.logsPath, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // Newest first

      // Keep only maxFiles
      if (files.length > this.maxFiles) {
        const filesToDelete = files.slice(this.maxFiles);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log(`Deleted old log file: ${file.name}`);
          } catch (error) {
            console.error(`Failed to delete log file ${file.name}:`, error.message);
          }
        });
      }
    } catch (error) {
      console.error('Log cleanup error:', error.message);
    }
  }

  /**
   * Compress log file (gzip)
   */
  compressLog(logFile) {
    try {
      const zlib = require('zlib');
      const gzip = zlib.createGzip();
      const input = fs.createReadStream(logFile);
      const output = fs.createWriteStream(`${logFile}.gz`);
      
      input.pipe(gzip).pipe(output);
      
      output.on('finish', () => {
        // Delete uncompressed file
        fs.unlinkSync(logFile);
      });
    } catch (error) {
      console.error('Log compression error:', error.message);
    }
  }

  /**
   * Initialize log rotation
   */
  initialize() {
    // Clean up old logs on startup
    this.cleanupOldLogs();
    
    // Set up periodic cleanup (daily)
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

module.exports = LogRotator;

