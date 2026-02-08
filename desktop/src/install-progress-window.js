/**
 * Installation Progress Window
 * Shows progress during dependency installation
 */

const { BrowserWindow } = require('electron');
const path = require('path');

class InstallProgressWindow {
  constructor() {
    this.window = null;
    this.isVisible = false;
  }

  /**
   * Create progress window
   */
  create() {
    if (this.window && !this.window.isDestroyed()) {
      return this.window;
    }

    this.window = new BrowserWindow({
      width: 500,
      height: 400,
      resizable: false,
      frame: false,
      transparent: false,
      backgroundColor: '#ffffff',
      show: false,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'install-progress-preload.js')
      }
    });

    // Load HTML
    this.window.loadFile(path.join(__dirname, 'install-progress.html'));

    // Handle window close
    this.window.on('closed', () => {
      this.window = null;
      this.isVisible = false;
    });

    return this.window;
  }

  /**
   * Show progress window
   */
  show() {
    if (!this.window) {
      this.create();
    }
    
    if (!this.window.isDestroyed()) {
      this.window.show();
      this.isVisible = true;
    }
  }

  /**
   * Hide progress window
   */
  hide() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.hide();
      this.isVisible = false;
    }
  }

  /**
   * Update progress
   */
  updateProgress(percent, message, details = '') {
    if (this.window && !this.window.isDestroyed() && this.isVisible) {
      this.window.webContents.send('update-progress', {
        percent: Math.min(100, Math.max(0, percent)),
        message: message || '',
        details: details || ''
      });
    }
  }

  /**
   * Show completion
   */
  showCompletion(success = true, message = '') {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('show-completion', {
        success,
        message
      });
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
    this.isVisible = false;
  }

  /**
   * Check if window is visible
   */
  isWindowVisible() {
    return this.isVisible && this.window && !this.window.isDestroyed();
  }
}

module.exports = InstallProgressWindow;

