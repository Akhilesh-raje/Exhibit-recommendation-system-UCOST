/**
 * Preload script for install progress window
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onProgressUpdate: (callback) => {
    ipcRenderer.on('update-progress', (event, data) => callback(data));
  },
  onCompletion: (callback) => {
    ipcRenderer.on('show-completion', (event, data) => callback(data));
  }
});

