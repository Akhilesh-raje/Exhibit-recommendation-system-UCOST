const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.dbPath = config.path;
    this.migrationsPath = config.migrationsPath;
    this.logger = null;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  log(level, message) {
    if (this.logger) {
      this.logger(level, message, 'database');
    } else {
      console.log(`[${level}] [database] ${message}`);
    }
  }

  async ensureDirectoryExists(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.log('info', `Created directory: ${dirPath}`);
      }
    } catch (error) {
      this.log('error', `Failed to create directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  async initialize() {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      await this.ensureDirectoryExists(dbDir);

      // Check if database already exists
      const dbExists = fs.existsSync(this.dbPath);

      if (!dbExists) {
        this.log('info', 'Database does not exist, initializing...');
        await this.createDatabase();
      } else {
        // CRITICAL: Check for database corruption or lock
        try {
          // Try to read database file to check if it's accessible
          fs.accessSync(this.dbPath, fs.constants.R_OK | fs.constants.W_OK);
          
          // Check if database is locked (SQLite busy)
          // This is a basic check - actual lock detection happens when opening
          this.log('info', 'Database exists, checking migrations...');
          await this.migrate();
        } catch (accessError) {
          if (accessError.code === 'EACCES') {
            this.log('error', `Permission denied accessing database: ${this.dbPath}`);
            throw new Error(`Database permission denied. Please check file permissions for: ${this.dbPath}`);
          } else if (accessError.code === 'ENOENT') {
            // File was deleted between check and access
            this.log('info', 'Database file was removed, recreating...');
            await this.createDatabase();
          } else {
            // Possible corruption or other error
            this.log('warn', `Database access error: ${accessError.message}. Will attempt to recreate.`);
            // Backup corrupted database
            const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
            try {
              fs.copyFileSync(this.dbPath, backupPath);
              this.log('info', `Backed up corrupted database to: ${backupPath}`);
            } catch (backupError) {
              this.log('warn', `Could not backup database: ${backupError.message}`);
            }
            // Remove corrupted database
            fs.unlinkSync(this.dbPath);
            // Recreate
            await this.createDatabase();
          }
        }
      }

      this.log('info', `Database ready at: ${this.dbPath}`);
      return true;
    } catch (error) {
      // CRITICAL: Enhanced error handling
      if (error.message.includes('SQLITE_BUSY') || error.message.includes('database is locked')) {
        this.log('error', 'Database is locked. Another process may be using it.');
        throw new Error('Database is locked. Please close other instances of the application and try again.');
      } else if (error.message.includes('corrupt') || error.message.includes('not a database')) {
        this.log('error', 'Database appears to be corrupted.');
        // Attempt recovery
        const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
        try {
          if (fs.existsSync(this.dbPath)) {
            fs.copyFileSync(this.dbPath, backupPath);
            fs.unlinkSync(this.dbPath);
            this.log('info', `Backed up corrupted database. Recreating...`);
            await this.createDatabase();
          }
        } catch (recoveryError) {
          this.log('error', `Database recovery failed: ${recoveryError.message}`);
          throw new Error('Database is corrupted and could not be recovered. Please delete the database file and restart.');
        }
      } else {
        this.log('error', `Database initialization failed: ${error.message}`);
        throw error;
      }
    }
  }

  async createDatabase() {
    try {
      // Run Prisma migrations to create database
      const backendPath = path.join(this.migrationsPath, '..', '..');
      const prismaPath = path.join(backendPath, 'node_modules', '.bin', 'prisma');

      // Check if Prisma CLI exists
      const prismaExists = fs.existsSync(prismaPath) || fs.existsSync(prismaPath + '.cmd');

      if (!prismaExists) {
        this.log('warn', 'Prisma CLI not found, database will be created on first backend start');
        return;
      }

      this.log('info', 'Running Prisma migrations...');

      // Generate Prisma Client
      try {
        await execAsync(`npx prisma generate`, {
          cwd: backendPath,
          shell: true
        });
        this.log('info', 'Prisma Client generated');
      } catch (error) {
        this.log('warn', `Prisma generate failed: ${error.message}`);
      }

      // Push schema to database
      try {
        await execAsync(`npx prisma db push`, {
          cwd: backendPath,
          shell: true,
          env: {
            ...process.env,
            DATABASE_URL: `file:${this.dbPath}`
          }
        });
        this.log('info', 'Database schema pushed');
      } catch (error) {
        this.log('warn', `Prisma db push failed: ${error.message}`);
        // Database will be created when backend starts
      }
    } catch (error) {
      this.log('error', `Failed to create database: ${error.message}`);
      // Don't throw - backend will handle database creation
    }
  }

  async migrate() {
    // Migration logic would go here
    // For now, we'll let Prisma handle migrations on backend start
    this.log('info', 'Migrations will be handled by backend service');
  }

  getDatabasePath() {
    return this.dbPath;
  }

  async backup(backupPath) {
    try {
      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, backupPath);
        this.log('info', `Database backed up to: ${backupPath}`);
        return true;
      } else {
        this.log('warn', 'Database does not exist, nothing to backup');
        return false;
      }
    } catch (error) {
      this.log('error', `Backup failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DatabaseManager;

