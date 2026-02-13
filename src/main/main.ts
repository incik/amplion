import { app, BrowserWindow, globalShortcut, Menu } from "electron";
import { createMainWindow, createSettingsWindow } from "./windows";
import { store } from "./store";
import { registerIpcHandlers } from "./ipc";
import { buildAppMenu } from "./menu";
import { registerGlobalShortcuts } from "./shortcuts";

let mainWindow: BrowserWindow;
let settingsWindow: BrowserWindow | null = null;
let isQuitting = false;

function toggleWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow(store, () => isQuitting);
    return;
  }

  if (mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.show();
    mainWindow.focus();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setVisibleOnAllWorkspaces(false);
      }
    }, 100);
  }
}

function openSettingsWindow(): void {
  createSettingsWindow(
    store,
    () => mainWindow,
    () => settingsWindow,
    (w) => {
      settingsWindow = w;
    },
  );
}

app.whenReady().then(() => {
  mainWindow = createMainWindow(store, () => isQuitting);

  registerIpcHandlers(
    store,
    () => mainWindow,
    () => settingsWindow,
    () => registerGlobalShortcuts(() => mainWindow, toggleWindow),
  );

  const menu = Menu.buildFromTemplate(buildAppMenu(openSettingsWindow));
  Menu.setApplicationMenu(menu);

  registerGlobalShortcuts(() => mainWindow, toggleWindow);

  app.on("activate", () => {
    if (process.platform === "darwin") {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      }
    } else if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(store, () => isQuitting);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
