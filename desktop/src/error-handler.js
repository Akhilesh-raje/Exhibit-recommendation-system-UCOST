/**
 * Error Handler
 * Provides user-friendly error handling and diagnostic information
 */

const fs = require('fs');
const path = require('path');

class ErrorHandler {
  constructor(logger = null) {
    this.logger = logger;
    this.errorLog = [];
  }

  /**
   * Log error with context
   */
  logError(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context: context
    };

    this.errorLog.push(errorInfo);

    if (this.logger) {
      this.logger('error', `[${context.service || 'APP'}] ${error.message}`, context.service);
    }

    console.error(`[ERROR] ${error.message}`, context);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error, context = {}) {
    const errorMessage = error.message.toLowerCase();

    // Python-related errors
    if (errorMessage.includes('python') || errorMessage.includes('pip')) {
      return {
        title: 'Python Setup Required',
        message: 'Python 3.8+ is required but not found. Please install Python from https://www.python.org/downloads/',
        action: 'Install Python and restart the application',
        helpUrl: 'https://www.python.org/downloads/'
      };
    }

    // Port conflict errors
    if (errorMessage.includes('port') && errorMessage.includes('already in use')) {
      return {
        title: 'Port Conflict',
        message: 'A required port is already in use. The application will try to use an alternative port.',
        action: 'Close other applications using ports 5000, 4321, 8001, 8011, or 8088',
        helpUrl: null
      };
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('sqlite')) {
      return {
        title: 'Database Error',
        message: 'There was an issue with the database. The application will attempt to recreate it.',
        action: 'Restart the application. If the problem persists, delete the database file and restart.',
        helpUrl: null
      };
    }

    // Service startup errors
    if (errorMessage.includes('service') || errorMessage.includes('failed to start')) {
      return {
        title: 'Service Startup Error',
        message: `The ${context.service || 'service'} failed to start. Check the logs for more details.`,
        action: 'Check the logs folder for detailed error information',
        helpUrl: null
      };
    }

    // File not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('enoent')) {
      return {
        title: 'File Not Found',
        message: 'A required file is missing. The application may need to be reinstalled.',
        action: 'Try reinstalling the application',
        helpUrl: null
      };
    }

    // Generic error
    return {
      title: 'An Error Occurred',
      message: error.message || 'An unexpected error occurred',
      action: 'Check the logs for more information',
      helpUrl: null
    };
  }

  /**
   * Show error dialog (for Electron)
   */
  showErrorDialog(window, error, context = {}) {
    if (!window) return;

    const friendly = this.getUserFriendlyMessage(error, context);

    // Use Electron's dialog if available
    if (window.webContents && window.webContents.send) {
      window.webContents.send('show-error', {
        title: friendly.title,
        message: friendly.message,
        action: friendly.action,
        helpUrl: friendly.helpUrl,
        details: error.stack
      });
    }
  }

  /**
   * Generate diagnostic report
   */
  generateDiagnosticReport(userDataPath) {
    const report = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      errors: this.errorLog,
      system: {
        cpus: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem()
      },
      paths: {
        userData: userDataPath,
        logs: path.join(userDataPath, 'logs'),
        database: path.join(userDataPath, 'database.db')
      }
    };

    // Check if paths exist
    report.pathsExist = {
      userData: fs.existsSync(userDataPath),
      logs: fs.existsSync(path.join(userDataPath, 'logs')),
      database: fs.existsSync(path.join(userDataPath, 'database.db'))
    };

    return report;
  }

  /**
   * Save diagnostic report to file
   */
  saveDiagnosticReport(userDataPath) {
    try {
      const report = this.generateDiagnosticReport(userDataPath);
      const reportPath = path.join(userDataPath, 'logs', `diagnostic-${Date.now()}.json`);
      
      // Ensure logs directory exists
      const logsDir = path.dirname(reportPath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      return reportPath;
    } catch (error) {
      console.error('Failed to save diagnostic report:', error);
      return null;
    }
  }

  /**
   * Handle uncaught exceptions
   */
  setupGlobalHandlers(userDataPath) {
    process.on('uncaughtException', (error) => {
      this.logError(error, { type: 'uncaughtException' });
      this.saveDiagnosticReport(userDataPath);
      
      // Don't exit immediately, let the app handle it
      console.error('Uncaught Exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.logError(error, { type: 'unhandledRejection' });
      this.saveDiagnosticReport(userDataPath);
      
      console.error('Unhandled Rejection:', reason);
    });
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Get error summary
   */
  getErrorSummary() {
    const summary = {
      total: this.errorLog.length,
      byType: {},
      recent: this.errorLog.slice(-10) // Last 10 errors
    };

    for (const error of this.errorLog) {
      const type = error.context.service || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;
    }

    return summary;
  }
}

module.exports = ErrorHandler;

