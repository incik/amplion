const { contextBridge, ipcRenderer } = require('electron');

// Expose settings API to renderer
contextBridge.exposeInMainWorld('settingsAPI', {
    getCurrentShortcut: () => ipcRenderer.invoke('get-current-shortcut'),
    setCustomShortcut: (shortcut) => ipcRenderer.invoke('set-custom-shortcut', shortcut),
    resetToDefault: () => ipcRenderer.invoke('reset-shortcut'),
    closeWindow: () => ipcRenderer.invoke('close-settings-window'),
});
