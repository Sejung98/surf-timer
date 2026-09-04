const { contextBridge, ipcRenderer } = require('electron');

let initialSettings = {};
try {
  initialSettings = ipcRenderer.sendSync('get-persistent-settings-sync') || {};
} catch (e) {
  console.warn('Failed to load initialSettings sync:', e);
}

contextBridge.exposeInMainWorld('electronAPI', {
  initialSettings,
  loadPersistentSettings: () => ipcRenderer.invoke('load-persistent-settings'),
  savePersistentSettings: (settings) => ipcRenderer.invoke('save-persistent-settings', settings),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  togglePin: (forceValue) => ipcRenderer.send('toggle-pin', forceValue),
  toggleCompactMode: (forceMode) => ipcRenderer.send('toggle-compact-mode', forceMode),
  toggleTaskbarDock: (forceMode) => ipcRenderer.send('toggle-taskbar-dock', forceMode),
  createNewWindow: () => ipcRenderer.send('create-new-window'),
  setProgressBar: (progress) => ipcRenderer.send('update-timer-progress', progress),
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
  },
  onTaskbarDockChanged: (callback) => {
    const handler = (_event, value) => callback(value);
    ipcRenderer.on('taskbar-dock-changed', handler);
    return () => ipcRenderer.removeListener('taskbar-dock-changed', handler);
  }
});
