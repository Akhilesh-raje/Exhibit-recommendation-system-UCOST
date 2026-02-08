const { contextBridge, ipcRenderer } = require('electron');

// CRITICAL: Error handling for context bridge
try {
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  contextBridge.exposeInMainWorld('electronAPI', {
  // Service status
  getServiceStatus: () => ipcRenderer.invoke('get-service-status'),
  getAllServiceStatus: () => ipcRenderer.invoke('get-all-service-status'),
  
  // Service control
  restartService: (serviceName) => ipcRenderer.invoke('restart-service', serviceName),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  
  // Logs
  getLogs: (serviceName) => ipcRenderer.invoke('get-logs', serviceName),
  
  // Events
  onServiceStatusChange: (callback) => {
    ipcRenderer.on('service-status-change', (event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
  });
} catch (error) {
  // CRITICAL: Fallback if context bridge fails
  console.error('Failed to expose electronAPI:', error);
  // Expose minimal API for error reporting
  window.electronAPI = {
    getAppVersion: () => Promise.resolve('1.0.0'),
    getAppConfig: () => Promise.resolve({}),
    getAllServiceStatus: () => Promise.resolve({}),
    getServiceStatus: () => Promise.resolve({ status: 'error', error: 'IPC not available' }),
    restartService: () => Promise.reject(new Error('IPC not available')),
    getLogs: () => Promise.resolve(null),
    onServiceStatusChange: () => {},
    removeAllListeners: () => {}
  };
}

