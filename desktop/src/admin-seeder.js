/**
 * Admin user seeder
 * Creates default admin user on first run
 */

const bcrypt = require('bcryptjs');
const path = require('path');

class AdminSeeder {
  constructor(databasePath, logger = null) {
    this.databasePath = databasePath;
    this.logger = logger;
    this.prisma = null;
  }

  log(level, message) {
    if (this.logger) {
      this.logger(level, message, 'admin-seeder');
    } else {
      console.log(`[${level}] [admin-seeder] ${message}`);
    }
  }

  async initialize(backendPath) {
    try {
      // Try to load Prisma Client from backend
      let PrismaClient;
      try {
        // Try from backend node_modules
        const prismaPath = path.join(backendPath, 'node_modules', '@prisma', 'client');
        PrismaClient = require(prismaPath).PrismaClient;
      } catch (error) {
        // Fallback: try from desktop node_modules (if installed)
        try {
          PrismaClient = require('@prisma/client').PrismaClient;
        } catch (e) {
          throw new Error('Prisma Client not found. Please ensure backend dependencies are installed.');
        }
      }

      // Initialize Prisma with database path
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${this.databasePath}`
          }
        }
      });

      // Test connection
      await this.prisma.$connect();
      this.log('info', 'Prisma client initialized');
      return true;
    } catch (error) {
      this.log('error', `Failed to initialize Prisma: ${error.message}`);
      return false;
    }
  }

  async seedAdmin(backendPath) {
    if (!this.prisma) {
      if (!backendPath) {
        this.log('error', 'Backend path required for Prisma initialization');
        return false;
      }
      const initialized = await this.initialize(backendPath);
      if (!initialized) {
        return false;
      }
    }

    try {
      // Check if admin already exists
      const existingAdmin = await this.prisma.adminUser.findFirst({
        where: {
          email: 'admin@ucost.com'
        }
      });

      if (existingAdmin) {
        this.log('info', 'Admin user already exists');
        return true;
      }

      // Create default admin
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await this.prisma.adminUser.create({
        data: {
          email: 'admin@ucost.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      });

      this.log('info', 'Default admin user created');
      this.log('warn', `⚠️  Default credentials: admin@ucost.com / ${defaultPassword}`);
      this.log('warn', '⚠️  Please change the password after first login!');
      
      return true;
    } catch (error) {
      this.log('error', `Failed to seed admin user: ${error.message}`);
      // Don't throw - admin can be created manually
      return false;
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}

module.exports = AdminSeeder;

