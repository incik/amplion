import type { Event, Input } from "electron";
import { app, BrowserWindow, globalShortcut, Menu } from "electron";
import path from "path";
import { store } from "./store";
import { registerIpcHandlers } from "./ipc";
import { injectYouTubeAndRenderer, injectYouTubeMusicShell } from "./inject";
import { isYouTubeMusicUrl, isYouTubeUrl } from "./urlHelpers";
import { buildAppMenu } from "./menu";
import { registerGlobalShortcuts } from "./shortcuts";

function persistUrlByHost(url: string): void {
  if (isYouTubeMusicUrl(url)) {
    store.set("lastUrlYouTubeMusic", url);
  } else if (isYouTubeUrl(url)) {
    store.set("lastUrlYouTube", url);
  }
}

let mainWindow: BrowserWindow | undefined;
let settingsWindow: BrowserWindow | null = null;
let isQuitting = false;

function createWindow() {
  // Get saved window position or use defaults
  const windowBounds = store.get("windowBounds");

  // Always start at 600px height (full YouTube mode)
  windowBounds.height = 600;

  const appPath = app.getAppPath();

  // Resolve icon path - support both dev and prod
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "images", "icon-mac-512x512.png")
    : path.join(appPath, "images", "icon-mac-512x512.png");

  const win = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    title: "Amplion",
    backgroundColor: "#000000",
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: iconPath,
  });
  mainWindow = win;

  const service = store.get("service");
  const initialUrl =
    service === "youtubeMusic"
      ? store.get("lastUrlYouTubeMusic")
      : store.get("lastUrlYouTube");
  win.webContents.loadURL(initialUrl);

  win.once("ready-to-show", () => {
    win.show();
  });

  win.webContents.on("before-input-event", (_event: Event, input: Input) => {
    if (input.key === "F12") {
      win.webContents.toggleDevTools();
    }
  });

  win.on("close", (event: Event) => {
    if (process.platform === "darwin" && !isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on("hide", () => {
    store.set("windowBounds", win.getBounds());
  });

  win.on("close", () => {
    if (process.platform !== "darwin") {
      store.set("windowBounds", win.getBounds());
    }
  });

  win.webContents.on("did-finish-load", () => {
    const url = win.webContents.getURL();
    if (isYouTubeMusicUrl(url)) {
      injectYouTubeMusicShell(win.webContents);
    } else if (isYouTubeUrl(url)) {
      injectYouTubeAndRenderer(win.webContents);
    }
  });

  win.webContents.on("did-navigate-in-page", (_event: Event, url: string) => {
    persistUrlByHost(url);
    store.set("lastUrl", url);
  });

  win.webContents.on("did-navigate", (_event: Event, url: string) => {
    persistUrlByHost(url);
    store.set("lastUrl", url);
  });
}

function createSettingsWindow() {
  // If settings window already exists, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "Settings",
    backgroundColor: "#1a1a1a",
    webPreferences: {
      preload: path.join(
        __dirname,
        "..",
        "settings-preload",
        "settings-preload.js",
      ),
      nodeIntegration: false,
      contextIsolation: true,
    },
    parent: mainWindow,
    modal: true,
    show: false,
  });
  settingsWindow = win;

  const settingsHtmlPath = path.join(
    app.getAppPath(),
    "renderer_dist",
    "src",
    "settings",
    "index.html",
  );
  win.loadFile(settingsHtmlPath);

  win.once("ready-to-show", () => {
    win.show();
  });

  // close the window on Esc key press
  win.webContents.on("before-input-event", (event: Event, input: Input) => {
    if (input.key === "Escape") {
      win.close();
    }
  });

  win.on("closed", () => {
    settingsWindow = null;
  });
}

function toggleWindow() {
  // If window doesn't exist or has been destroyed, recreate it
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  // If window is focused (visible on current desktop), hide it
  // Otherwise (hidden or on another desktop), show it on current desktop
  if (mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    // Make window appear on current space/desktop
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.show();
    mainWindow.focus();
    // Reset to normal behavior after showing
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setVisibleOnAllWorkspaces(false);
      }
    }, 100);
  }
}

app.whenReady().then(() => {
  registerIpcHandlers(
    store,
    () => mainWindow,
    () => settingsWindow,
    () => registerGlobalShortcuts(() => mainWindow, toggleWindow),
  );
  createWindow();

  // Create application menu
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildAppMenu(() => createSettingsWindow())));

  // Register global shortcuts
  registerGlobalShortcuts(() => mainWindow, toggleWindow);

  app.on("activate", () => {
    // macOS only: clicking the dock icon should show the window if hidden
    if (process.platform === "darwin") {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      } else if (BrowserWindow.getAllWindows().length === 0) {
        // If no window exists, create one
        createWindow();
      }
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
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
