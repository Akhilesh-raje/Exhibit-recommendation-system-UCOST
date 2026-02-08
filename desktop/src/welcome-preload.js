/**
 * Preload script for welcome window
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServiceStatus: () => ipcRenderer.invoke('welcome:get-service-status'),
  getAppVersion: () => ipcRenderer.invoke('welcome:get-app-version'),
  onServiceStatusUpdate: (callback) => {
    ipcRenderer.on('service-status-update', (event, data) => callback(data));
  }
});

