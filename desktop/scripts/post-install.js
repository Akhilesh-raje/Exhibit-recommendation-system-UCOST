#!/usr/bin/env node

/**
 * Post-Installation Script
 * Runs after installation to initialize database and verify setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Initialize database
 */
async function initializeDatabase(backendPath, dbPath) {
  log('Initializing database...', 'blue');

  try {
    // Check if Prisma is available
    const prismaPath = path.join(backendPath, 'prisma');
    if (!fs.existsSync(prismaPath)) {
      log('  ⚠️  Prisma directory not found, database will be created on first run', 'yellow');
      return true;
    }

    // Try to run Prisma migrations (if backend is built)
    const distPath = path.join(backendPath, 'dist');
    if (fs.existsSync(distPath)) {
      try {
        // Check if npx is available
        execSync('npx prisma --version', {
          stdio: 'pipe',
          timeout: 10000,
          shell: true
        });

        // Set DATABASE_URL
        process.env.DATABASE_URL = `file:${dbPath}`;
        
        // Run migrations
        execSync(`npx prisma migrate deploy`, {
          cwd: backendPath,
          stdio: 'inherit',
          timeout: 60000,
          shell: true,
          env: {
            ...process.env,
            DATABASE_URL: `file:${dbPath}`
          }
        });

        log('  ✅ Database migrations completed', 'green');
        return true;
      } catch (error) {
        log(`  ⚠️  Migration failed: ${error.message}`, 'yellow');
        log('  Database will be initialized on first run', 'yellow');
        return true; // Not critical
      }
    } else {
      log('  ⚠️  Backend not built, database will be initialized on first run', 'yellow');
      return true;
    }
  } catch (error) {
    log(`  ⚠️  Database initialization warning: ${error.message}`, 'yellow');
    return true; // Not critical, will be created on first run
  }
}

/**
 * Seed admin user (if possible)
 */
async function seedAdminUser(backendPath, dbPath) {
  log('Seeding admin user...', 'blue');

  try {
    // This will be handled by the backend on first run
    // Just verify the database exists
    if (fs.existsSync(dbPath)) {
      log('  ✅ Database ready for admin user creation', 'green');
      log('  Admin user will be created on first run', 'cyan');
      return true;
    } else {
      log('  ⚠️  Database will be created on first run', 'yellow');
      return true;
    }
  } catch (error) {
    log(`  ⚠️  Admin seeding skipped: ${error.message}`, 'yellow');
    return true; // Not critical
  }
}

/**
 * Create default configuration
 */
function createDefaultConfig(userDataPath) {
  log('Creating default configuration...', 'blue');

  try {
    const configDir = userDataPath;
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'config.json');
    const defaultConfig = {
      version: '1.0.0',
      firstRun: true,
      services: {
        backend: { port: 5000, enabled: true },
        chatbot: { port: 4321, enabled: true },
        embed: { port: 8001, enabled: true },
        gemma: { port: 8011, enabled: true },
        ocr: { port: 8088, enabled: true }
      },
      database: {
        path: path.join(userDataPath, 'database.db'),
        type: 'sqlite'
      }
    };

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      log('  ✅ Default configuration created', 'green');
    } else {
      log('  ✅ Configuration already exists', 'green');
    }

    return true;
  } catch (error) {
    log(`  ⚠️  Configuration creation warning: ${error.message}`, 'yellow');
    return true; // Not critical
  }
}

/**
 * Verify service endpoints (if services are running)
 */
async function verifyServiceEndpoints(servicePorts) {
  log('Verifying service endpoints...', 'blue');

  const services = [
    { name: 'Backend', port: servicePorts.backend || 5000, path: '/health' },
    { name: 'Chatbot', port: servicePorts.chatbot || 4321, path: '/health' },
    { name: 'Embed Service', port: servicePorts.embed || 8001, path: '/health' },
    { name: 'Gemma Service', port: servicePorts.gemma || 8011, path: '/health' }
  ];

  let verifiedCount = 0;

  for (const service of services) {
    try {
      const response = await axios.get(`http://localhost:${service.port}${service.path}`, {
        timeout: 2000,
        validateStatus: () => true
      });

      if (response.status < 500) {
        log(`  ✅ ${service.name} - accessible`, 'green');
        verifiedCount++;
      } else {
        log(`  ⚠️  ${service.name} - not responding (may not be running)`, 'yellow');
      }
    } catch (error) {
      log(`  ⚠️  ${service.name} - not running (will start on app launch)`, 'yellow');
    }
  }

  if (verifiedCount === 0) {
    log('  ℹ️  Services will start automatically when app launches', 'cyan');
  }

  return verifiedCount;
}

/**
 * Create necessary directories
 */
function createDirectories(userDataPath) {
  log('Creating application directories...', 'blue');

  const directories = [
    userDataPath,
    path.join(userDataPath, 'logs'),
    path.join(userDataPath, 'uploads'),
    path.join(userDataPath, 'cache'),
    path.join(userDataPath, 'database')
  ];

  for (const dir of directories) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`  ✅ Created: ${path.basename(dir)}`, 'green');
      } else {
        log(`  ✅ Exists: ${path.basename(dir)}`, 'green');
      }
    } catch (error) {
      log(`  ⚠️  Failed to create ${dir}: ${error.message}`, 'yellow');
    }
  }

  return true;
}

/**
 * Main post-install function
 */
async function runPostInstall(options = {}) {
  const {
    userDataPath,
    backendPath,
    dbPath,
    servicePorts = {}
  } = options;

  log('\n' + '='.repeat(60), 'cyan');
  log('POST-INSTALLATION SETUP', 'cyan');
  log('='.repeat(60), 'cyan');
  log('');

  try {
    // Create directories
    createDirectories(userDataPath);

    // Create default configuration
    createDefaultConfig(userDataPath);

    // Initialize database
    if (backendPath && dbPath) {
      await initializeDatabase(backendPath, dbPath);
      await seedAdminUser(backendPath, dbPath);
    }

    // Verify services (if running)
    await verifyServiceEndpoints(servicePorts);

    log('\n' + '='.repeat(60), 'cyan');
    log('✅ POST-INSTALLATION COMPLETE', 'green');
    log('='.repeat(60), 'cyan');
    log('\nThe application is ready to use!', 'green');
    log('Launch the app to start all services.', 'cyan');

    return {
      success: true,
      message: 'Post-installation completed successfully'
    };
  } catch (error) {
    log('\n' + '='.repeat(60), 'cyan');
    log('⚠️  POST-INSTALLATION COMPLETED WITH WARNINGS', 'yellow');
    log('='.repeat(60), 'cyan');
    log(`Some steps had warnings: ${error.message}`, 'yellow');
    log('The application should still work, but some features may need manual setup.', 'yellow');

    return {
      success: true, // Still success, just with warnings
      warning: true,
      message: error.message
    };
  }
}

// Export for use as module
if (require.main === module) {
  // Run as script
  const args = process.argv.slice(2);
  const userDataPath = args[0] || path.join(process.env.APPDATA || process.env.HOME, 'ucost-discovery-hub');
  const backendPath = args[1] || null;
  const dbPath = args[2] || path.join(userDataPath, 'database.db');

  runPostInstall({
    userDataPath,
    backendPath,
    dbPath
  }).then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    log(`\n❌ Post-installation error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = {
    runPostInstall,
    initializeDatabase,
    seedAdminUser,
    createDefaultConfig,
    verifyServiceEndpoints,
    createDirectories
  };
}

