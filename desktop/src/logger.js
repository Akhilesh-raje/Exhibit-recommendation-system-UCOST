const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logsPath) {
    this.logsPath = logsPath;
    this.ensureLogsDirectory();
    this.logFile = path.join(logsPath, `app-${new Date().toISOString().split('T')[0]}.log`);
    
    // STATE-OF-THE-ART: Initialize log rotation
    const LogRotator = require('./log-rotator');
    this.rotator = new LogRotator(logsPath, {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 30, // Keep 30 days
      compressOldLogs: false // Can enable if needed
    });
    this.rotator.initialize();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsPath)) {
      fs.mkdirSync(this.logsPath, { recursive: true });
    }
  }

  formatMessage(level, message, service = null) {
    const timestamp = new Date().toISOString();
    const serviceTag = service ? `[${service}]` : '';
    return `[${timestamp}] [${level}] ${serviceTag} ${message}\n`;
  }

  log(level, message, service = null) {
    const formatted = this.formatMessage(level, message, service);
    
    // Console output
    console.log(formatted.trim());
    
    // STATE-OF-THE-ART: Rotate log if needed before writing
    this.rotator.rotateIfNeeded(this.logFile);
    
    // File output
    try {
      fs.appendFileSync(this.logFile, formatted);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message, service = null) {
    this.log('INFO', message, service);
  }

  error(message, service = null) {
    this.log('ERROR', message, service);
  }

  warn(message, service = null) {
    this.log('WARN', message, service);
  }

  debug(message, service = null) {
    this.log('DEBUG', message, service);
  }
}

module.exports = Logger;

