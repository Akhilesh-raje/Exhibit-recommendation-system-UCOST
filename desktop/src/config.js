const path = require('path');
const { app } = require('electron');

// Get user data directory
const getUserDataPath = () => {
  return app ? app.getPath('userData') : path.join(process.cwd(), 'user-data');
};

// CRITICAL: Use app.isPackaged instead of NODE_ENV for reliable detection
// app.isPackaged is set by Electron and is always correct, while NODE_ENV
// may be undefined in packaged apps, causing them to use dev paths incorrectly
const isPackaged = () => {
  return app ? app.isPackaged : false;
};

// Service configurations
const getServiceConfig = () => {
  const isDev = !isPackaged(); // Use isPackaged instead of NODE_ENV
  const userDataPath = getUserDataPath();
  const projectRoot = isDev
    ? path.join(__dirname, '../../')
    : (process.resourcesPath || path.join(path.dirname(process.execPath), 'resources'));

  return {
    // Node.js services
    backend: {
      name: 'backend',
      type: 'node',
      path: isDev
        ? path.join(projectRoot, 'project/backend/backend')
        : path.join(projectRoot, 'backend'),
      entry: isDev ? 'src/app.ts' : 'dist/app.js',
      port: 5000,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: `file:${path.join(userDataPath, 'database.db')}`,
        UPLOADS_DIR: path.join(userDataPath, 'uploads'),
        PORT: 5000,
        // JWT_SECRET will be set by env-validator if not provided
        JWT_SECRET: process.env.JWT_SECRET || '',
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
        UPLOAD_PATH: path.join(userDataPath, 'uploads'),
        MAX_FILE_SIZE: '10485760'
      },
      healthCheck: {
        url: 'http://localhost:5000/health',
        interval: 2000,
        timeout: 10000 // Increased timeout for backend
      }
    },
    chatbot: {
      name: 'chatbot',
      type: 'node',
      path: isDev
        ? path.join(projectRoot, 'project/chatbot-mini')
        : path.join(projectRoot, 'chatbot'),
      entry: isDev ? 'src/server.ts' : 'dist/server.js',
      port: 4321,
      dependencies: ['backend', 'gemma'], // STATE-OF-THE-ART: Service dependencies
      env: {
        NODE_ENV: 'production',
        PORT: 4321,
        BACKEND_URL: 'http://localhost:5000',
        API_BASE_URL: 'http://localhost:5000/api',
        GEMMA_URL: 'http://localhost:8011',
        CSV_PATH: isPackaged() // Use isPackaged() instead of isDev for reliability
          ? path.join(projectRoot, 'data/exhibits.csv')
          : path.join(projectRoot, 'docs/exhibits.csv'),
        RERANKER_PATH: isPackaged()
          ? path.join(projectRoot, 'models/reranker.json')
          : path.join(projectRoot, 'project/chatbot-mini/models/reranker.json')
      },
      healthCheck: {
        url: 'http://localhost:4321/health',
        interval: 2000,
        timeout: 10000 // Increased timeout for chatbot
      }
    },
    // Python services
    embed: {
      name: 'embed',
      type: 'python',
      path: isDev
        ? path.join(projectRoot, 'project/embed-service')
        : path.join(projectRoot, 'embed-service'),
      script: 'main.py',
      port: 8001,
      env: {
        PORT: 8001
      },
      healthCheck: {
        url: 'http://localhost:8001/health',
        interval: 3000,
        timeout: 15000 // Increased timeout for Python services
      }
    },
    gemma: {
      name: 'gemma',
      type: 'python',
      path: isDev
        ? path.join(projectRoot, 'gemma/infer')
        : path.join(projectRoot, 'gemma/infer'),
      script: 'server.py',
      port: 8011,
      env: {
        PORT: 8011
      },
      healthCheck: {
        url: 'http://localhost:8011/health',
        interval: 3000,
        timeout: 20000 // Gemma may take longer to start
      }
    },
    ocr: {
      name: 'ocr',
      type: 'node', // OCR uses Node.js wrapper
      path: isDev
        ? path.join(projectRoot, 'project/ocr-engine')
        : path.join(projectRoot, 'ocr-engine'),
      entry: 'server.js',
      port: 8088,
      env: {
        PORT: 8088
      },
      healthCheck: {
        url: 'http://localhost:8088/api/health',
        interval: 3000,
        timeout: 10000 // Increased timeout for OCR
      }
    }
  };
};

// Frontend configuration
// CRITICAL: Use app.isPackaged for reliable path detection
// This ensures packaged apps always use resources/frontend/dist
// instead of incorrectly looking for project/frontend/... paths
const getFrontendConfig = () => {
  const PathUtils = require('./path-utils');

  // If packaged, always use PathUtils to find frontend in resources
  if (isPackaged()) {
    const frontendPath = PathUtils.findFrontendPath();
    return {
      path: frontendPath,
      port: 5173,
      serveLocally: true // CRITICAL: Always use HTTP server, never file://
    };
  }

  // Development mode (running from source via npm run dev)
  const projectRoot = path.join(__dirname, '../../');
  return {
    path: path.join(projectRoot, 'project/frontend/ucost-discovery-hub/dist'),
    port: 5173,
    serveLocally: true // CRITICAL: Enable local serving in dev too for React compatibility
  };
};

// Database configuration
const getDatabaseConfig = () => {
  const isDev = !isPackaged();
  const userDataPath = getUserDataPath();
  const projectRoot = isPackaged()
    ? (process.resourcesPath || path.join(path.dirname(process.execPath), 'resources'))
    : path.join(__dirname, '../../');

  return {
    path: path.join(userDataPath, 'database.db'),
    type: 'sqlite',
    migrationsPath: path.join(projectRoot, isPackaged() ? 'backend/prisma' : 'project/backend/backend/prisma')
  };
};

// Python configuration
const getPythonConfig = () => {
  const isDev = !isPackaged(); // Use isPackaged instead of NODE_ENV
  const resourcesPath = isDev
    ? path.join(__dirname, '../../resources')
    : (process.resourcesPath || path.join(path.dirname(process.execPath), 'resources'));

  return {
    bundled: {
      path: path.join(resourcesPath, 'python'),
      executable: process.platform === 'win32'
        ? path.join(resourcesPath, 'python', 'python.exe')
        : path.join(resourcesPath, 'python', 'python3')
    },
    venv: {
      path: path.join(resourcesPath, 'venv'),
      executable: process.platform === 'win32'
        ? path.join(resourcesPath, 'venv', 'Scripts', 'python.exe')
        : path.join(resourcesPath, 'venv', 'bin', 'python')
    },
    requirements: {
      full: path.join(__dirname, '../requirements/requirements.txt'),
      minimal: path.join(__dirname, '../requirements/requirements-min.txt')
    },
    minVersion: { major: 3, minor: 8 }
  };
};

// App configuration
const getAppConfig = () => {
  return {
    name: 'UCOST Discovery Hub',
    version: '1.0.0',
    userDataPath: getUserDataPath(),
    logsPath: path.join(getUserDataPath(), 'logs'),
    uploadsPath: path.join(getUserDataPath(), 'uploads'),
    cachePath: path.join(getUserDataPath(), 'cache')
  };
};

module.exports = {
  getServiceConfig,
  getFrontendConfig,
  getDatabaseConfig,
  getPythonConfig,
  getAppConfig,
  getUserDataPath
};

