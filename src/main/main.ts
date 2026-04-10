import type { Event, Input, MenuItemConstructorOptions } from "electron";
import { app, BrowserWindow, globalShortcut, Menu } from "electron";
import path from "path";
import { DEFAULT_SHORTCUT, store } from "./store";
import { registerIpcHandlers } from "./ipc";
import { injectYouTubeAndRenderer, injectYouTubeMusicShell } from "./inject";

function isYouTubeMusicUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "music.youtube.com";
  } catch {
    return false;
  }
}

function isYouTubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "www.youtube.com" || host === "youtube.com";
  } catch {
    return false;
  }
}

function persistUrlByHost(url: string): void {
  if (isYouTubeMusicUrl(url)) {
    store.set("lastUrlYouTubeMusic", url);
  } else if (isYouTubeUrl(url)) {
    store.set("lastUrlYouTube", url);
  }
}

let mainWindow: BrowserWindow | undefined;
// let mainWindowView: BrowserView | null = null;
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

  // const view = new BrowserView({
  //   webPreferences: {
  //     nodeIntegration: false,
  //     contextIsolation: true,
  //   },
  // });
  // mainWindowView = view;
  // mainWindow.setBrowserView(view);

  // const syncViewBounds = () => {
  //   const { width, height } = mainWindow.getContentBounds();
  //   mainWindow.setBounds({ x: 0, y: 0, width, height });
  // };
  // syncViewBounds();
  // mainWindow.setAutoResize({ width: true, height: true });
  // mainWindow.on("resize", syncViewBounds);

  const service = store.get("service");
  const initialUrl =
    service === "youtubeMusic"
      ? store.get("lastUrlYouTubeMusic")
      : store.get("lastUrlYouTube");
  win.webContents.loadURL(initialUrl);

  win.once("ready-to-show", () => {
    console.log("showing main window");
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

  win.webContents.on("media-started-playing", () => {
    console.log("Media started playing");
  });

  win.webContents.on("media-paused", () => {
    console.log("Media paused");
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

function registerGlobalShortcut() {
  // Unregister existing shortcut first
  globalShortcut.unregisterAll();

  // Get custom shortcut from store or use default
  const shortcut = store.get("customShortcut", DEFAULT_SHORTCUT);

  // Register window toggle shortcut
  const ret = globalShortcut.register(shortcut, () => {
    toggleWindow();
  });

  if (!ret) {
    console.log("Global shortcut registration failed for:", shortcut);
    // Fall back to default if custom shortcut fails
    if (shortcut !== DEFAULT_SHORTCUT) {
      console.log("Falling back to default shortcut");
      store.set("customShortcut", DEFAULT_SHORTCUT);
      globalShortcut.register(DEFAULT_SHORTCUT, () => {
        toggleWindow();
      });
    }
  } else {
    console.log("Global shortcut registered:", shortcut);
  }

  // Register media key shortcuts
  globalShortcut.register("MediaPlayPause", () => {
    mainWindow?.webContents.send("media-play-pause");
  });

  globalShortcut.register("MediaNextTrack", () => {
    mainWindow?.webContents.send("media-next-track");
  });

  globalShortcut.register("MediaPreviousTrack", () => {
    mainWindow?.webContents.send("media-previous-track");
  });
}

app.whenReady().then(() => {
  registerIpcHandlers(
    store,
    () => mainWindow,
    () => settingsWindow,
    registerGlobalShortcut,
  );
  createWindow();

  // Create application menu
  const isMac = process.platform === "darwin";

  const template = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              {
                label: "Settings...",
                accelerator: "CommandOrControl+,",
                click: () => createSettingsWindow(),
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    // File menu (Windows/Linux)
    ...(!isMac
      ? [
          {
            label: "File",
            submenu: [
              {
                label: "Settings...",
                accelerator: "CommandOrControl+,",
                click: () => createSettingsWindow(),
              },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
  ];

  const menu = Menu.buildFromTemplate(
    template as unknown as MenuItemConstructorOptions[],
  );
  Menu.setApplicationMenu(menu);

  // Register global shortcuts
  registerGlobalShortcut();

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
