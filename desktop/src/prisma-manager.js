/**
 * Prisma Manager
 * Handles Prisma client generation and database setup
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

class PrismaManager {
  constructor(backendPath, databasePath, logger = null) {
    this.backendPath = backendPath;
    this.databasePath = databasePath;
    this.logger = logger;
  }

  log(level, message) {
    if (this.logger) {
      this.logger(level, message, 'prisma');
    } else {
      console.log(`[${level}] [prisma] ${message}`);
    }
  }

  /**
   * Check if Prisma is available
   */
  async checkPrismaAvailable() {
    try {
      await execAsync('npx prisma --version', {
        cwd: this.backendPath,
        shell: true
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate Prisma Client
   */
  async generateClient() {
    try {
      this.log('info', 'Generating Prisma Client...');
      
      await execAsync('npx prisma generate', {
        cwd: this.backendPath,
        shell: true,
        env: {
          ...process.env,
          DATABASE_URL: `file:${this.databasePath}`
        }
      });

      this.log('info', 'Prisma Client generated successfully');
      return true;
    } catch (error) {
      this.log('error', `Failed to generate Prisma Client: ${error.message}`);
      // Check if node_modules exists
      const nodeModulesPath = path.join(this.backendPath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        this.log('error', 'node_modules not found. Please run npm install in backend directory.');
      }
      return false;
    }
  }

  /**
   * Push database schema
   */
  async pushSchema() {
    try {
      this.log('info', 'Pushing database schema...');
      
      await execAsync('npx prisma db push --skip-generate', {
        cwd: this.backendPath,
        shell: true,
        env: {
          ...process.env,
          DATABASE_URL: `file:${this.databasePath}`
        }
      });

      this.log('info', 'Database schema pushed successfully');
      return true;
    } catch (error) {
      this.log('error', `Failed to push schema: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize database (generate + push)
   */
  async initialize() {
    const prismaAvailable = await this.checkPrismaAvailable();
    if (!prismaAvailable) {
      this.log('warn', 'Prisma CLI not available. Database will be initialized by backend.');
      return false;
    }

    const generated = await this.generateClient();
    if (!generated) {
      return false;
    }

    const pushed = await this.pushSchema();
    return pushed;
  }

  /**
   * Check if Prisma Client is generated
   */
  isClientGenerated() {
    const clientPath = path.join(
      this.backendPath,
      'node_modules',
      '.prisma',
      'client',
      'index.js'
    );
    return fs.existsSync(clientPath);
  }
}

module.exports = PrismaManager;

