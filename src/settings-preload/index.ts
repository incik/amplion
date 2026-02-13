import { contextBridge, ipcRenderer } from "electron";

// Expose settings API to renderer
contextBridge.exposeInMainWorld("settingsAPI", {
  getCurrentShortcut: () =>
    ipcRenderer.invoke("get-current-shortcut") as Promise<string>,
  setCustomShortcut: (shortcut: string) =>
    ipcRenderer.invoke("set-custom-shortcut", shortcut) as Promise<{
      success: boolean;
      error?: string;
    }>,
  resetToDefault: () =>
    ipcRenderer.invoke("reset-shortcut") as Promise<{
      success: boolean;
      shortcut?: string;
      error?: string;
    }>,
  closeWindow: () =>
    ipcRenderer.invoke("close-settings-window") as Promise<void>,
});
