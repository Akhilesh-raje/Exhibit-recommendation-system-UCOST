const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Environment setup utility for desktop app
 * Ensures all required directories and files exist
 */
class EnvSetup {
  constructor(appConfig) {
    this.appConfig = appConfig;
  }

  async setup() {
    const directories = [
      this.appConfig.userDataPath,
      this.appConfig.logsPath,
      this.appConfig.uploadsPath,
      this.appConfig.cachePath,
      path.dirname(this.appConfig.databasePath || path.join(this.appConfig.userDataPath, 'database.db'))
    ];

    // Create all required directories
    for (const dir of directories) {
      if (dir && !fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        } catch (error) {
          // CRITICAL: Enhanced error handling for file system issues
          if (error.code === 'EACCES') {
            console.error(`Permission denied creating directory ${dir}. Please run as administrator or check folder permissions.`);
            throw new Error(`Permission denied: Cannot create directory ${dir}. Please check permissions or run as administrator.`);
          } else if (error.code === 'ENOSPC') {
            console.error(`No space left on device: ${dir}`);
            throw new Error(`No disk space available. Please free up disk space and try again.`);
          } else if (error.code === 'ENAMETOOLONG') {
            console.error(`Path too long: ${dir}`);
            throw new Error(`Path too long: ${dir}. Please install to a shorter path.`);
          } else {
            console.error(`Failed to create directory ${dir}:`, error);
            throw new Error(`Failed to create directory ${dir}: ${error.message}`);
          }
        }
      } else if (dir && fs.existsSync(dir)) {
        // CRITICAL: Check write permissions on existing directories
        try {
          fs.accessSync(dir, fs.constants.W_OK);
        } catch (accessError) {
          if (accessError.code === 'EACCES') {
            throw new Error(`Permission denied: Cannot write to directory ${dir}. Please check permissions.`);
          }
        }
      }
    }

    // Create .gitkeep files to ensure directories are tracked
    const gitkeepFiles = [
      path.join(this.appConfig.logsPath, '.gitkeep'),
      path.join(this.appConfig.uploadsPath, '.gitkeep'),
      path.join(this.appConfig.cachePath, '.gitkeep')
    ];

    for (const file of gitkeepFiles) {
      if (!fs.existsSync(file)) {
        try {
          fs.writeFileSync(file, '');
        } catch (error) {
          // Ignore errors
        }
      }
    }

    return true;
  }

  async ensureUploadsDirectory() {
    if (!fs.existsSync(this.appConfig.uploadsPath)) {
      fs.mkdirSync(this.appConfig.uploadsPath, { recursive: true });
    }
  }

  async ensureCacheDirectory() {
    if (!fs.existsSync(this.appConfig.cachePath)) {
      fs.mkdirSync(this.appConfig.cachePath, { recursive: true });
    }
  }

  async ensureLogsDirectory() {
    if (!fs.existsSync(this.appConfig.logsPath)) {
      fs.mkdirSync(this.appConfig.logsPath, { recursive: true });
    }
  }
}

module.exports = EnvSetup;

