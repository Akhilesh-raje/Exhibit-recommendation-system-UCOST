/**
 * Environment variable validator
 * Ensures all required environment variables are set
 */

class EnvValidator {
  constructor() {
    this.requiredVars = {
      backend: ['DATABASE_URL', 'JWT_SECRET'],
      chatbot: ['GEMMA_URL', 'API_BASE_URL'],
      optional: ['JWT_EXPIRES_IN', 'UPLOAD_PATH', 'MAX_FILE_SIZE']
    };
  }

  /**
   * Generate a secure JWT secret if not provided
   */
  generateJWTSecret() {
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Validate and set environment variables for backend
   * STATE-OF-THE-ART: Uses JWTSecretManager for persistence
   */
  validateBackendEnv(userDataPath) {
    const JWTSecretManager = require('./jwt-secret-manager');
    const jwtManager = new JWTSecretManager(userDataPath);
    
    const env = {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '5000',
      DATABASE_URL: process.env.DATABASE_URL || `file:${require('path').join(userDataPath, 'database.db')}`,
      JWT_SECRET: process.env.JWT_SECRET || jwtManager.getOrCreateSecret(), // STATE-OF-THE-ART: Persistent secret
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      UPLOAD_PATH: process.env.UPLOAD_PATH || require('path').join(userDataPath, 'uploads'),
      MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '10485760'
    };

    // No warning needed - secret is now persisted
    return env;
  }

  /**
   * Validate and set environment variables for chatbot
   */
  validateChatbotEnv(backendPort, gemmaPort, csvPath) {
    const env = {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || '4321',
      GEMMA_URL: process.env.GEMMA_URL || `http://localhost:${gemmaPort}`,
      API_BASE_URL: process.env.API_BASE_URL || `http://localhost:${backendPort}/api`,
      CSV_PATH: process.env.CSV_PATH || csvPath
    };

    return env;
  }

  /**
   * Validate Python service environment
   */
  validatePythonEnv(port) {
    const env = {
      ...process.env,
      PORT: port.toString()
    };

    return env;
  }

  /**
   * Check if all required files exist
   */
  validateFiles(config) {
    const fs = require('fs');
    const path = require('path');
    const missing = [];

    // Check CSV file for chatbot
    if (config.chatbot && config.chatbot.csvPath) {
      if (!fs.existsSync(config.chatbot.csvPath)) {
        missing.push(`Chatbot CSV file: ${config.chatbot.csvPath}`);
      }
    }

    // Check Python scripts
    if (config.embed && config.embed.script) {
      const embedScript = path.join(config.embed.path, config.embed.script);
      if (!fs.existsSync(embedScript)) {
        missing.push(`Embed service script: ${embedScript}`);
      }
    }

    if (config.gemma && config.gemma.script) {
      const gemmaScript = path.join(config.gemma.path, config.gemma.script);
      if (!fs.existsSync(gemmaScript)) {
        missing.push(`Gemma service script: ${gemmaScript}`);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Validate Python installation
   */
  async validatePython() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('python --version');
      const version = stdout.trim();
      const match = version.match(/Python (\d+)\.(\d+)/);
      
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        if (major >= 3 && minor >= 10) {
          return { valid: true, version };
        }
      }
      
      return { valid: false, error: `Python 3.10+ required, found: ${version}` };
    } catch (error) {
      return { valid: false, error: 'Python not found in PATH' };
    }
  }
}

module.exports = EnvValidator;

