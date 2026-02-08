/**
 * Welcome Screen
 * Enhanced welcome screen with service status and quick actions
 */

const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class WelcomeScreen {
  constructor(serviceManager) {
    this.window = null;
    this.serviceManager = serviceManager;
  }

  /**
   * Create welcome window
   */
  create() {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      resizable: true,
      frame: true,
      backgroundColor: '#ffffff',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'welcome-preload.js')
      }
    });

    // Load HTML
    this.window.loadFile(path.join(__dirname, 'welcome.html'));

    // Handle window close
    this.window.on('closed', () => {
      this.window = null;
    });

    // Setup IPC handlers
    this.setupIpcHandlers();

    return this.window;
  }

  /**
   * Setup IPC handlers
   */
  setupIpcHandlers() {
    // Get service status
    ipcMain.handle('welcome:get-service-status', () => {
      if (!this.serviceManager) {
        return {};
      }
      return this.serviceManager.getAllServiceStatus();
    });

    // Get app version
    ipcMain.handle('welcome:get-app-version', () => {
      const { app } = require('electron');
      return app.getVersion();
    });
  }

  /**
   * Show welcome window
   */
  show() {
    if (!this.window) {
      this.create();
    }
    
    if (!this.window.isDestroyed()) {
      this.window.show();
      this.updateServiceStatus();
    }
  }

  /**
   * Update service status
   */
  updateServiceStatus() {
    if (this.window && !this.window.isDestroyed() && this.serviceManager) {
      const status = this.serviceManager.getAllServiceStatus();
      this.window.webContents.send('service-status-update', status);
    }
  }

  /**
   * Close window
   */
  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    this.window = null;
  }
}

module.exports = WelcomeScreen;

