const { BrowserWindow, app } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

// CRITICAL: Ensure app is available (should always be in Electron)
const getApp = () => {
  try {
    return require('electron').app;
  } catch {
    return null;
  }
};

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.splashWindow = null;
  }

  createSplashScreen() {
    this.splashWindow = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: false // Simplified for splash screen
      }
    });

    const splashPath = path.join(__dirname, 'splash.html');
    this.splashWindow.loadFile(splashPath);
    this.splashWindow.center();

    return this.splashWindow;
  }

  updateSplashStatus(message, progress = null) {
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      try {
        this.splashWindow.webContents.send('splash-update', { message, progress });
      } catch (error) {
        // If IPC fails, try executing JavaScript directly
        this.splashWindow.webContents.executeJavaScript(`
          if (typeof updateSplash === 'function') {
            updateSplash({ message: ${JSON.stringify(message)}, progress: ${progress} });
          } else if (window.dispatchEvent) {
            window.postMessage({ type: 'splash-update', message: ${JSON.stringify(message)}, progress: ${progress} }, '*');
          }
        `).catch(() => {
          // Ignore errors
        });
      }
    }
  }

  async waitForServices(serviceManager, serviceConfigs, services) {
    const totalServices = services.length;
    let startedServices = 0;
    let failedServices = 0;
    const isDev = process.env.NODE_ENV !== 'production';
    const maxWaitTime = 90000; // STATE-OF-THE-ART: 90 seconds max total wait time
    const startTime = Date.now();
    
    // STATE-OF-THE-ART: Service status tracking
    const serviceStatus = new Map();

    for (const serviceName of services) {
      // Check if we've exceeded max wait time
      if (Date.now() - startTime > maxWaitTime) {
        console.warn(`Service startup timeout after ${maxWaitTime}ms, continuing with available services...`);
        this.updateSplashStatus('Continuing with available services...', 90);
        break;
      }

      try {
        const statusMessage = isDev 
          ? `Checking ${serviceName}...` 
          : `Starting ${serviceName}...`;
        this.updateSplashStatus(statusMessage, (startedServices / totalServices) * 100);
        
        const serviceConfig = serviceConfigs[serviceName];
        if (!serviceConfig) {
          console.warn(`Service config not found: ${serviceName}, skipping...`);
          failedServices++;
          continue;
        }

        // Add timeout to service startup
        const serviceStartPromise = serviceManager.startService(serviceName, serviceConfig);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Service ${serviceName} startup timeout`)), 30000)
        );

        try {
          await Promise.race([serviceStartPromise, timeoutPromise]);
          startedServices++;
          const service = serviceManager.services.get(serviceName);
          const successMessage = service && service.external
            ? `${serviceName} connected (existing)`
            : service && service.status === 'warning'
            ? `${serviceName} started (warning)`
            : `${serviceName} started`;
          
          // STATE-OF-THE-ART: Track service status
          serviceStatus.set(serviceName, { status: 'running', port: service?.port });
          
          this.updateSplashStatus(successMessage, (startedServices / totalServices) * 100);
        } catch (timeoutError) {
          console.warn(`Service ${serviceName} startup timeout, continuing...`);
          failedServices++;
          serviceStatus.set(serviceName, { status: 'timeout', error: 'Startup timeout' });
          this.updateSplashStatus(`${serviceName} timeout, continuing...`, (startedServices / totalServices) * 100);
        }
      } catch (error) {
        console.error(`Failed to start ${serviceName}:`, error.message);
        failedServices++;
        serviceStatus.set(serviceName, { status: 'error', error: error.message });
        this.updateSplashStatus(`${serviceName} failed, continuing...`, (startedServices / totalServices) * 100);
        // Continue with other services even if one fails
      }
    }

    // STATE-OF-THE-ART: Return service status summary
    const hasServices = startedServices > 0 || (isDev && startedServices + failedServices === totalServices);
    if (!hasServices) {
      console.warn('No services started successfully, but continuing anyway...');
    }
    
    // Log service status summary
    console.log('\n=== Service Startup Summary ===');
    serviceStatus.forEach((status, name) => {
      const icon = status.status === 'running' ? '✅' : status.status === 'timeout' ? '⏱️' : '❌';
      console.log(`${icon} ${name}: ${status.status}${status.port ? ` (port ${status.port})` : ''}`);
    });
    console.log('================================\n');
    
    return { success: hasServices, services: Object.fromEntries(serviceStatus) };
  }

  async createMainWindow(serviceManager, frontendConfig) {
    // Close splash screen
    if (this.splashWindow && !this.splashWindow.isDestroyed()) {
      this.splashWindow.close();
      this.splashWindow = null;
    }

    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 1024,
      minHeight: 600,
      show: false, // Don't show until ready
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        // CRITICAL: For Electron with file:// protocol, we need to allow unsafe-eval
        // This is required for Vite's build output and React to work properly
        webSecurity: true
      }
    });

    // CRITICAL: Always prefer HTTP server over file:// protocol
    // file:// protocol has issues with React, CSP, and module loading
    // Use app.isPackaged instead of NODE_ENV for reliable detection
    const electronApp = getApp();
    const isDev = electronApp ? !electronApp.isPackaged : process.env.NODE_ENV !== 'production';
    
    // Priority 1: Use frontend server URL (HTTP) - BEST for React
    if (frontendConfig.url) {
      console.log('Loading from frontend server (HTTP):', frontendConfig.url);
      
      // CRITICAL: Verify server is ready before loading
      // This prevents blank screens from loading before server is ready
      const verifyAndLoad = async () => {
        try {
          const axios = require('axios');
          // Wait for server to respond
          await axios.get(frontendConfig.url, { 
            timeout: 5000,
            validateStatus: () => true // Accept any status, just check if server responds
          });
          console.log('✅ Frontend server verified, loading window...');
          this.mainWindow.loadURL(frontendConfig.url);
        } catch (error) {
          console.error('❌ Frontend server not ready:', error.message);
          // Retry after short delay
          setTimeout(() => {
            console.log('Retrying frontend server load...');
            this.mainWindow.loadURL(frontendConfig.url);
          }, 1000);
        }
      };
      
      verifyAndLoad();
    } 
    // Priority 2: Try Vite dev server (development only)
    else if (isDev) {
      const viteUrl = 'http://localhost:5173';
      console.log('Checking for Vite dev server...');
      
      axios.get(viteUrl, { 
        timeout: 2000,
        validateStatus: (status) => status < 500
      })
        .then((response) => {
          console.log('Loading from Vite dev server:', viteUrl);
          this.mainWindow.loadURL(viteUrl);
        })
        .catch((error) => {
          // Vite not running - try to start frontend server from built files
          console.log('Vite dev server not running, starting frontend server from built files...');
          this.startFrontendServerAndLoad(frontendConfig);
        });
    }
    // Priority 3: Start frontend server from built files (production or dev fallback)
    else {
      console.log('Starting frontend server from built files...');
      this.startFrontendServerAndLoad(frontendConfig);
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      if (isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // CRITICAL: Add error handlers to catch loading failures
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`Failed to load ${validatedURL}: ${errorDescription} (code: ${errorCode})`);
      // Show error screen if loading fails
      if (errorCode !== -3) { // -3 is ERR_ABORTED (user navigation), ignore it
        this.showErrorScreen(
          `Failed to load application!\n\nURL: ${validatedURL}\nError: ${errorDescription} (${errorCode})\n\nPlease check the logs for more details.`,
          {
            path: frontendConfig.path,
            logPath: (() => {
              const electronApp = getApp();
              return electronApp && electronApp.isPackaged
                ? require('path').join(electronApp.getPath('userData'), 'logs')
                : 'logs';
            })()
          }
        );
      }
    });

    // CRITICAL: Detect if page stays blank (no content loaded after timeout)
    const blankPageTimeout = setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.executeJavaScript('document.body.innerHTML').then((body) => {
          if (!body || body.trim() === '' || body === '<div id="root"></div>') {
            console.warn('Page appears to be blank, checking if frontend server is running...');
            // Try to reload or show error
            if (!frontendConfig.url) {
              console.log('Frontend server URL not set, attempting to start server...');
              this.startFrontendServerAndLoad(frontendConfig);
            }
          }
        }).catch(() => {
          // Page might not be ready yet, ignore
        });
      }
    }, 10000); // 10 second timeout

    // Clear timeout when page loads successfully
    this.mainWindow.webContents.once('did-finish-load', () => {
      clearTimeout(blankPageTimeout);
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  showErrorScreen(errorMessage, details = {}) {
    if (this.mainWindow) {
      const diagnosticInfo = details.path ? 
        `\n\nPath checked: ${details.path}` : '';
      const logInfo = details.logPath ?
        `\n\nCheck logs: ${details.logPath}` : '';
      
      const escapedMessage = this.escapeHtml(errorMessage + diagnosticInfo + logInfo);

      // Build full HTML for the error screen
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>Error - UCOST Discovery Hub</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .error-container {
              text-align: center;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 16px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              max-width: 600px;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            h1 { 
              color: #ffd700; 
              margin-top: 0;
              font-size: 2em;
            }
            .code-block {
              background: rgba(0, 0, 0, 0.3);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: left;
              font-family: 'Courier New', monospace;
              font-size: 13px;
              color: #fff;
              white-space: pre-wrap;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            button {
              background: #4CAF50;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              margin: 10px;
              transition: all 0.3s;
            }
            button:hover { 
              background: #45a049;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>⚠️ Application Error</h1>
            <div class="code-block">${escapedMessage}</div>
            <button onclick="location.reload()">🔄 Retry</button>
            <button onclick="window.close()">❌ Close</button>
          </div>
        </body>
        </html>
      `;

      // NOTE: data: URLs must be URI-encoded or Chromium will treat them as invalid
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      this.mainWindow.loadURL(dataUrl);
    }
  }

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }

  async startFrontendServerAndLoad(frontendConfig) {
    try {
      const FrontendServer = require('./frontend-server');
      const frontendPath = frontendConfig.path;
      const indexPath = path.join(frontendPath, 'index.html');
      
      if (!fs.existsSync(indexPath)) {
        throw new Error(`Frontend index.html not found: ${indexPath}`);
      }
      
      // Start frontend server
      const server = new FrontendServer({
        path: frontendPath,
        port: frontendConfig.port || 5173,
        serveLocally: true
      });
      
      await server.start();
      const serverUrl = server.getUrl();
      console.log('Frontend server started, loading from:', serverUrl);
      this.mainWindow.loadURL(serverUrl);
    } catch (error) {
      console.error('Failed to start frontend server:', error);
      const diagnostics = `Path checked: ${frontendConfig.path}\n\n` +
        `Error: ${error.message}\n\n` +
        `Please ensure frontend is built:\n` +
        `  cd project/frontend/ucost-discovery-hub\n` +
        `  npm run build`;
      
      const electronApp = getApp();
      const logPath = electronApp && electronApp.isPackaged
        ? require('path').join(electronApp.getPath('userData'), 'logs')
        : 'logs';
      
      this.showErrorScreen(
        'Failed to start frontend server!\n\n' + diagnostics,
        {
          path: frontendConfig.path,
          logPath: logPath
        }
      );
    }
  }

  getMainWindow() {
    return this.mainWindow;
  }
}

module.exports = WindowManager;

