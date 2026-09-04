const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  togglePin: (forceValue) => ipcRenderer.send('toggle-pin', forceValue),
  toggleCompactMode: (forceMode) => ipcRenderer.send('toggle-compact-mode', forceMode),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  onPinChanged: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('pin-status-changed', handler);
    return () => ipcRenderer.removeListener('pin-status-changed', handler);
  },
  onCompactChanged: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('compact-mode-changed', handler);
    return () => ipcRenderer.removeListener('compact-mode-changed', handler);
  }
});
