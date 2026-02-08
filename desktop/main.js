const { app, ipcMain } = require('electron');
const path = require('path');

// CRITICAL: Ensure correct environment in packaged app
// Many parts of the app (paths, services, frontend) depend on NODE_ENV.
// When running the installed .exe, NODE_ENV is usually undefined, which
// makes the app think it's in development and look for "project/..." paths
// that do NOT exist inside the packaged resources.
//
// In a packaged build, always treat NODE_ENV as "production" so that:
// - getFrontendConfig() uses the bundled "frontend/dist" path
// - getServiceConfig() uses "backend/dist", "chatbot/dist", etc.
// - PathUtils correctly uses process.resourcesPath
if (app.isPackaged && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'production';
}

// Import managers
const ServiceManager = require('./src/service-manager');
const WindowManager = require('./src/window-manager');
const DatabaseManager = require('./src/database-manager');
const FrontendServer = require('./src/frontend-server');
const Logger = require('./src/logger');
const ErrorHandler = require('./src/error-handler');
const InstallProgressWindow = require('./src/install-progress-window');
const EnvSetup = require('./src/env-setup');
const EnvValidator = require('./src/env-validator');
const PrismaManager = require('./src/prisma-manager');
const AdminSeeder = require('./src/admin-seeder');
const PathUtils = require('./src/path-utils');
const AutoInstaller = require('./src/auto-installer');
const StartupOrchestrator = require('./src/startup-orchestrator');
const { injectFrontendConfig, updateFrontendConfig } = require('./src/frontend-config');
const {
  getServiceConfig,
  getFrontendConfig,
  getDatabaseConfig,
  getAppConfig
} = require('./src/config');

// Global instances
let serviceManager = null;
let windowManager = null;
let databaseManager = null;
let frontendServer = null;
let logger = null;
let errorHandler = null;
let installProgressWindow = null;
let appConfig = null;

// Detect if running in development or production
const isDev = process.env.NODE_ENV !== 'production';

// STATE-OF-THE-ART: Overall startup timeout (2 minutes)
const STARTUP_TIMEOUT = 120000; // 2 minutes

// Service startup order (services that depend on others should start later)
const SERVICE_STARTUP_ORDER = [
  'backend',    // Start backend first (others depend on it)
  'embed',       // Python services can start in parallel
  'gemma',       // Python services can start in parallel
  'ocr',         // Python services can start in parallel
  'chatbot'      // Chatbot depends on backend and gemma
];

async function initializeApp() {
  const startupStartTime = Date.now();
  const fs = require('fs');
  const debugLogPath = path.join(process.env.APPDATA || '.', 'UCOST Discovery Hub', 'startup-debug.txt');

  // DEBUG: File-based logging for packaged app
  const debugLog = (msg) => {
    try {
      const dir = path.dirname(debugLogPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(debugLogPath, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) { /* ignore */ }
  };
  debugLog('=== initializeApp() started ===');
  debugLog(`NODE_ENV: ${process.env.NODE_ENV}`);
  debugLog(`app.isPackaged: ${app.isPackaged}`);
  debugLog(`resourcesPath: ${process.resourcesPath}`);

  try {
    // STATE-OF-THE-ART: Overall startup timeout
    const startupTimeout = setTimeout(() => {
      logger?.error('Application startup timeout exceeded. Some services may not be ready.');
      logger?.warn('Continuing with available services...');
    }, STARTUP_TIMEOUT);

    // Initialize configuration
    appConfig = getAppConfig();
    debugLog(`appConfig.logsPath: ${appConfig.logsPath}`);

    // Initialize logger
    logger = new Logger(appConfig.logsPath);
    logger.info('Starting UCOST Discovery Hub Desktop Application');

    // Initialize error handler
    errorHandler = new ErrorHandler((level, message, service) => logger.log(level, message, service));
    errorHandler.setupGlobalHandlers(appConfig.userDataPath);

    // Initialize install progress window (for first-run dependency installation)
    installProgressWindow = new InstallProgressWindow();

    // Setup environment (directories, etc.)
    // CRITICAL: Create window manager and splash screen only once
    if (!windowManager) {
      windowManager = new WindowManager();
    }
    const splashWindow = windowManager.createSplashScreen();
    windowManager.updateSplashStatus('Setting up environment...', 0);

    // STATE-OF-THE-ART: Validate all resource paths (after window manager is created)
    if (process.env.NODE_ENV === 'production') {
      windowManager.updateSplashStatus('Validating resources...', 5);

      const pathValidation = PathUtils.validateAllResourcePaths();
      if (!pathValidation.valid) {
        logger.error('Resource path validation failed:');
        pathValidation.invalid.forEach(({ name, path, reason }) => {
          logger.error(`  ❌ ${name}: ${reason} (${path})`);
        });
        pathValidation.missing.forEach(({ name, path }) => {
          logger.warn(`  ⚠️  ${name}: Missing (${path})`);
        });

        if (pathValidation.invalid.length > 0) {
          throw new Error(`Critical resources missing. Please reinstall the application.`);
        }
      } else {
        logger.info('✅ All resource paths validated');
      }
    }

    const envSetup = new EnvSetup({
      userDataPath: appConfig.userDataPath,
      logsPath: appConfig.logsPath,
      uploadsPath: appConfig.uploadsPath,
      cachePath: appConfig.cachePath,
      databasePath: getDatabaseConfig().path
    });
    await envSetup.setup();
    logger.info('Environment setup complete');

    // Run auto-installer (first-run detection and setup)
    windowManager.updateSplashStatus('Checking installation...', 12);
    const autoInstaller = new AutoInstaller(
      process.resourcesPath || path.join(path.dirname(process.execPath), 'resources'),
      appConfig.userDataPath,
      logger
    );

    if (autoInstaller.isFirstRun()) {
      logger.info('🆕 First run detected - running setup wizard...');
      windowManager.updateSplashStatus('First run - setting up...', 15);

      const setupResult = await autoInstaller.runFirstTimeSetup(
        (message, progress) => {
          logger.info(`Setup: ${message}`);
          windowManager.updateSplashStatus(message, Math.min(15 + progress * 0.25, 40));
        }
      );

      if (!setupResult.success) {
        throw new Error('First-run setup failed');
      }

      logger.info('✅ First-run setup complete');
    } else {
      logger.info('Existing installation detected');
      await autoInstaller.quickSetupCheck(
        (message, progress) => windowManager.updateSplashStatus(message, 15 + progress * 0.05)
      );
    }

    // Initialize database
    windowManager.updateSplashStatus('Setting up database...', 10);
    const dbConfig = getDatabaseConfig();
    databaseManager = new DatabaseManager(dbConfig);
    databaseManager.setLogger((level, message, service) => logger.log(level, message, service));

    try {
      await databaseManager.initialize();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error(`Database initialization warning: ${error.message}`);
      // Continue anyway - backend will handle database creation
    }

    // Setup Prisma Client
    windowManager.updateSplashStatus('Preparing database client...', 12);
    const backendPath = isDev
      ? path.join(__dirname, '../project/backend/backend')
      : path.join(process.resourcesPath || path.join(path.dirname(process.execPath), 'resources'), 'backend');

    // Check if backend path exists
    const fs = require('fs');
    if (!fs.existsSync(backendPath)) {
      logger.warn(`Backend path not found: ${backendPath}. Prisma setup will be skipped.`);
    } else {
      const prismaManager = new PrismaManager(backendPath, dbConfig.path, (level, message) => logger.log(level, message));

      // CRITICAL: Avoid runtime generate if client already exists (avoids EPERM issues in packaged EXE)
      const clientExists = prismaManager.isClientGenerated();
      if (app.isPackaged && clientExists) {
        logger.info('✅ Prisma Client already found in resources, skipping runtime generation');
        try {
          await prismaManager.pushSchema();
          logger.info('✅ Database schema synced (existing client)');
        } catch (e) {
          logger.warn(`Prisma sync warning: ${e.message}`);
        }
      } else {
        try {
          await prismaManager.initialize();
          logger.info('Prisma setup complete');
        } catch (error) {
          logger.warn(`Prisma setup warning: ${error.message}`);
          // Continue - backend will handle it
        }
      }
    }

    // Seed admin user
    windowManager.updateSplashStatus('Setting up admin account...', 15);
    const adminSeeder = new AdminSeeder(dbConfig.path, (level, message) => logger.log(level, message));
    try {
      if (fs.existsSync(backendPath)) {
        const seeded = await adminSeeder.seedAdmin(backendPath);
        if (seeded) {
          await adminSeeder.disconnect();
        }
      } else {
        logger.warn('Admin seeding skipped - backend path not found');
      }
    } catch (error) {
      logger.warn(`Admin seeding warning: ${error.message}`);
      // Continue - admin can be created manually
    }

    // Validate environment and prepare service configs
    windowManager.updateSplashStatus('Validating environment...', 18);
    const envValidator = new EnvValidator();

    // Validate Python
    const pythonCheck = await envValidator.validatePython();
    if (!pythonCheck.valid) {
      logger.warn(`Python validation: ${pythonCheck.error}`);
    } else {
      logger.info(`Python found: ${pythonCheck.version}`);
    }

    // Validate files
    const serviceConfigs = getServiceConfig();
    debugLog(`backend.path: ${serviceConfigs.backend.path}`);
    debugLog(`backend.entry: ${serviceConfigs.backend.entry}`);
    debugLog(`backend path exists: ${require('fs').existsSync(serviceConfigs.backend.path)}`);
    const entryFullPath = path.join(serviceConfigs.backend.path, serviceConfigs.backend.entry);
    debugLog(`backend entry full path: ${entryFullPath}`);
    debugLog(`backend entry exists: ${require('fs').existsSync(entryFullPath)}`);

    const fileValidation = envValidator.validateFiles({
      chatbot: { csvPath: serviceConfigs.chatbot.env.CSV_PATH },
      embed: { path: serviceConfigs.embed.path, script: serviceConfigs.embed.script },
      gemma: { path: serviceConfigs.gemma.path, script: serviceConfigs.gemma.script }
    });

    if (!fileValidation.valid) {
      logger.warn('Missing files:', fileValidation.missing.join(', '));
    }

    // Update service configs with validated environment
    const dbPath = getDatabaseConfig().path;
    serviceConfigs.backend.env = envValidator.validateBackendEnv(path.dirname(dbPath));

    // Initialize service manager
    windowManager.updateSplashStatus('Preparing services...', 20);
    serviceManager = new ServiceManager();
    serviceManager.setLogger((level, message, service) => logger.log(level, message, service));

    // CRITICAL: Always start frontend server (HTTP) for React compatibility
    // file:// protocol causes React loading issues, CSP problems, and module errors
    windowManager.updateSplashStatus('Starting frontend server...', 30);
    let frontendConfig = getFrontendConfig();

    // STATE-OF-THE-ART: Use PathUtils for consistent path resolution
    // Use app.isPackaged instead of NODE_ENV for reliable detection
    if (app.isPackaged) {
      const foundPath = PathUtils.findFrontendPath();
      if (foundPath) {
        frontendConfig.path = foundPath;
        logger.info(`✅ Frontend path resolved: ${foundPath}`);
      } else {
        logger.warn(`⚠️  Frontend path not found using PathUtils, using config default: ${frontendConfig.path}`);
      }
    }

    // CRITICAL: Start frontend server in BOTH dev and production
    // This ensures React loads correctly via HTTP instead of file://
    if (fs.existsSync(frontendConfig.path)) {
      try {
        logger.info(`✅ Frontend found at: ${frontendConfig.path}`);

        // Enable local serving for both dev and production
        frontendConfig.serveLocally = true;

        frontendServer = new FrontendServer(frontendConfig);
        await frontendServer.start();
        frontendConfig.url = frontendServer.getUrl();
        logger.info(`✅ Frontend server started on ${frontendConfig.url} (HTTP - React compatible)`);
      } catch (error) {
        logger.error(`⚠️  Frontend server failed: ${error.message}`);
        logger.error(`Frontend path was: ${frontendConfig.path}`);
        logger.warn('Window manager will try to start server as fallback');
        // Continue - window manager will handle fallback
      }
    } else {
      logger.warn(`⚠️  Frontend directory not found at: ${frontendConfig.path}`);
      if (process.env.NODE_ENV === 'production') {
        const diagnostics = PathUtils.getPathDiagnostics();
        logger.error(`Path diagnostics: ${JSON.stringify(diagnostics, null, 2)}`);
      }
      // Continue - window manager will show error
    }

    // In development mode, check if services are already running
    // If they are, just connect to them instead of starting new ones
    // isDev is already defined at the top of the file

    if (isDev) {
      windowManager.updateSplashStatus('Checking existing services...', 40);
      logger.info('Development mode: Checking for existing services...');
    } else {
      windowManager.updateSplashStatus('Starting services...', 40);
    }

    // Start services with timeout protection
    windowManager.updateSplashStatus('Starting services (this may take a moment)...', 40);

    try {
      // PHASE 1: Start Backend first (others depend on it)
      windowManager.updateSplashStatus('Starting core services...', 40);
      await windowManager.waitForServices(serviceManager, serviceConfigs, ['backend']);

      const backendService = serviceManager.services.get('backend');
      const actualBackendUrl = backendService
        ? `http://localhost:${backendService.port}`
        : 'http://localhost:5000';

      // Inject actual backend port into other services before starting them
      if (serviceConfigs.chatbot) {
        serviceConfigs.chatbot.env.BACKEND_URL = actualBackendUrl;
        serviceConfigs.chatbot.env.API_BASE_URL = `${actualBackendUrl}/api`;
        logger.info(`🔗 Prepared Chatbot with Backend at: ${actualBackendUrl}`);
      }

      // PHASE 2: Start other services
      windowManager.updateSplashStatus('Starting AI and support services...', 60);
      const otherServices = SERVICE_STARTUP_ORDER.filter(s => s !== 'backend');

      const servicesStarted = await Promise.race([
        windowManager.waitForServices(
          serviceManager,
          serviceConfigs,
          otherServices
        ),
        new Promise((resolve) => {
          // Maximum 90 seconds for remaining services
          setTimeout(() => {
            logger.warn('Service startup timeout, continuing with available services...');
            resolve(false);
          }, 90000);
        })
      ]);

      if (!servicesStarted) {
        logger.warn('Some services failed to start, but continuing...');
      } else {
        logger.info('All services started successfully');
      }
    } catch (error) {
      logger.error(`Service startup error: ${error.message}`);
      logger.warn('Continuing anyway...');
    }

    // Update frontend configuration with actual service ports
    const servicePorts = {};
    for (const serviceName of SERVICE_STARTUP_ORDER) {
      const service = serviceManager.services.get(serviceName);
      if (service) {
        servicePorts[serviceName] = service.port;
      }
    }

    // STATE-OF-THE-ART: Dynamic configuration for the frontend
    const desktopConfig = {
      VITE_API_URL: `http://localhost:${servicePorts.backend || 5000}/api`,
      VITE_CHATBOT_API_URL: `http://localhost:${servicePorts.chatbot || 4321}`,
      VITE_EMBED_API_URL: `http://localhost:${servicePorts.embed || 8001}`,
      VITE_GEMMA_API_URL: `http://localhost:${servicePorts.gemma || 8011}`,
      VITE_OCR_API_URL: `http://localhost:${servicePorts.ocr || 8089}/api`,
      VITE_DESKTOP_MODE: 'true'
    };

    // Pass config to frontend server for request-time injection
    if (frontendServer) {
      frontendServer.setDesktopConfig(desktopConfig);
      logger.info('Frontend server updated with live service ports');
    }

    // Create main window
    windowManager.updateSplashStatus('Loading application...', 90);

    // Update frontend config with server URL if server is running
    if (frontendServer && frontendConfig.url) {
      logger.info(`Frontend will be loaded from server: ${frontendConfig.url}`);
    } else {
      logger.info(`Frontend will be loaded from file: ${frontendConfig.path}`);
    }

    await windowManager.createMainWindow(serviceManager, frontendConfig);
    logger.info('Main window created');

    windowManager.updateSplashStatus('Ready!', 100);

    // Small delay before closing splash
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
    }, 500);

    // Clear startup timeout
    clearTimeout(startupTimeout);

    const startupTime = Date.now() - startupStartTime;
    logger.info(`Application initialized successfully in ${(startupTime / 1000).toFixed(2)}s`);
  } catch (error) {
    clearTimeout(startupTimeout);

    logger.error(`Application initialization failed: ${error.message}`);
    logger.error(error.stack);

    // Use error handler for user-friendly messages
    if (errorHandler) {
      errorHandler.logError(error, { type: 'initialization' });
      const friendly = errorHandler.getUserFriendlyMessage(error);

      if (windowManager) {
        windowManager.showErrorScreen(
          `${friendly.title}\n\n${friendly.message}\n\n${friendly.action}`
        );
      }

      // Save diagnostic report
      errorHandler.saveDiagnosticReport(appConfig.userDataPath);
    } else {
      // Fallback if error handler not initialized
      if (windowManager) {
        windowManager.showErrorScreen(
          `Failed to start application: ${error.message}\n\nPlease check the logs for more details.`
        );
      }
    }
  }
}

// IPC Handlers
function setupIpcHandlers() {
  // Get service status
  ipcMain.handle('get-service-status', (event, serviceName) => {
    if (!serviceManager) return { status: 'not_initialized' };
    return serviceManager.getServiceStatus(serviceName);
  });

  // Get all service status
  ipcMain.handle('get-all-service-status', () => {
    if (!serviceManager) return {};
    return serviceManager.getAllServiceStatus();
  });

  // Restart service
  ipcMain.handle('restart-service', async (event, serviceName) => {
    if (!serviceManager) {
      throw new Error('Service manager not initialized');
    }

    try {
      logger.info(`Restarting service: ${serviceName}`);
      await serviceManager.stopService(serviceName);

      const serviceConfigs = getServiceConfig();
      const config = serviceConfigs[serviceName];
      if (!config) {
        throw new Error(`Service config not found: ${serviceName}`);
      }

      await serviceManager.startService(serviceName, config);
      logger.info(`Service ${serviceName} restarted successfully`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to restart ${serviceName}: ${error.message}`);
      throw error;
    }
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Get app config
  ipcMain.handle('get-app-config', () => {
    return appConfig || getAppConfig();
  });

  // Get logs (simplified - just return log file path)
  ipcMain.handle('get-logs', (event, serviceName) => {
    if (!logger) return null;
    return logger.logFile;
  });

  // Open documentation
  ipcMain.on('open-documentation', (event) => {
    const { shell } = require('electron');
    const docsPath = path.join(__dirname, 'docs', 'USER_MANUAL.md');
    shell.openPath(docsPath).catch(() => {
      // If file doesn't exist, try opening docs folder
      shell.openPath(path.join(__dirname, 'docs'));
    });
  });
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  initializeApp();
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    logger?.info('All windows closed, shutting down...');

    // Stop all services
    if (serviceManager) {
      try {
        await serviceManager.stopAll();
      } catch (error) {
        logger?.error(`Error stopping services: ${error.message}`);
      }
    }

    // Stop frontend server
    if (frontendServer) {
      try {
        await frontendServer.stop();
      } catch (error) {
        logger?.error(`Error stopping frontend server: ${error.message}`);
      }
    }

    app.quit();
  }
});

app.on('activate', () => {
  if (windowManager && !windowManager.getMainWindow()) {
    initializeApp();
  }
});

// Handle uncaught exceptions (error handler will also handle these)
process.on('uncaughtException', (error) => {
  logger?.error(`Uncaught exception: ${error.message}`);
  logger?.error(error.stack);
  errorHandler?.logError(error, { type: 'uncaughtException' });
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger?.error(`Unhandled rejection: ${reason}`);
  errorHandler?.logError(error, { type: 'unhandledRejection' });
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (windowManager && windowManager.getMainWindow()) {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

