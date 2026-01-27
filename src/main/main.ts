import type {
  Event,
  IpcMainEvent,
  IpcMainInvokeEvent,
  Input,
  MenuItemConstructorOptions,
} from "electron";
import {
  app,
  BrowserWindow,
  BrowserView,
  globalShortcut,
  Menu,
  ipcMain,
} from "electron";
import fs from "fs";
import path from "path";
import Store from "electron-store";

const DEFAULT_SHORTCUT = "CommandOrControl+Shift+Z";

type WindowBounds = {
  width: number;
  height: number;
  x?: number;
  y?: number;
};

type StoreSchema = {
  windowBounds: WindowBounds;
  lastUrl: string;
  customShortcut: string;
};

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 500, height: 600, x: undefined, y: undefined },
    lastUrl: "https://www.youtube.com",
    customShortcut: DEFAULT_SHORTCUT,
  },
});

let mainWindow: BrowserWindow;
let mainWindowView: BrowserView | null = null;
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

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    title: "Amplion",
    backgroundColor: "#000000",
    show: false, // Don't show until ready
    icon: iconPath,
  });

  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindowView = view;
  mainWindow.setBrowserView(view);

  const syncViewBounds = () => {
    const { width, height } = mainWindow.getContentBounds();
    view.setBounds({ x: 0, y: 0, width, height });
  };
  syncViewBounds();
  view.setAutoResize({ width: true, height: true });
  mainWindow.on("resize", syncViewBounds);

  // Load YouTube or last visited URL
  const lastUrl = store.get("lastUrl");
  view.webContents.loadURL(lastUrl);

  // Show window when ready
  view.webContents.once("dom-ready", () => {
    mainWindow.show();
  });

  // Open DevTools with F12 for debugging
  view.webContents.on("before-input-event", (event: Event, input: Input) => {
    if (input.key === "F12") {
      view.webContents.toggleDevTools();
    }
  });

  // Intercept close event - platform-specific behavior
  mainWindow.on("close", (event: Event) => {
    if (process.platform === "darwin" && !isQuitting) {
      // macOS: hide instead of closing so music keeps playing (unless actually quitting)
      event.preventDefault();
      mainWindow.hide();
    }
    // Windows/Linux: allow normal close behavior
  });

  // Save window position when hidden (macOS) or closing (Windows/Linux)
  mainWindow.on("hide", () => {
    const bounds = mainWindow.getBounds();
    store.set("windowBounds", bounds);
  });

  mainWindow.on("close", () => {
    if (process.platform !== "darwin") {
      const bounds = mainWindow.getBounds();
      store.set("windowBounds", bounds);
    }
  });

  // Handle window resize requests from renderer
  ipcMain.on(
    "resize-window",
    (
      event: IpcMainEvent,
      { width, height }: { width: number; height: number },
    ) => {
      if (mainWindow) {
        const currentBounds = mainWindow.getBounds();
        // Center the window vertically when resizing
        const newY = currentBounds.y + (currentBounds.height - height) / 2;
        mainWindow.setBounds(
          {
            x: currentBounds.x,
            y: Math.round(newY),
            width: width,
            height: height,
          },
          true,
        ); // animate = true
      }
    },
  );

  // Handle store operations from renderer
  ipcMain.on(
    "store-set",
    (event: IpcMainEvent, { key, value }: { key: string; value: unknown }) => {
      store.set(key, value);
    },
  );

  ipcMain.on(
    "store-get",
    (
      event: IpcMainEvent,
      { key, defaultValue }: { key: string; defaultValue: unknown },
    ) => {
      event.returnValue = store.get(key, defaultValue);
    },
  );

  // IPC handlers for settings window
  ipcMain.handle("get-current-shortcut", () => {
    return store.get("customShortcut", DEFAULT_SHORTCUT);
  });

  ipcMain.handle(
    "set-custom-shortcut",
    (event: IpcMainInvokeEvent, shortcut: string) => {
      try {
        // Save to store
        store.set("customShortcut", shortcut);

        // Re-register global shortcuts with new shortcut
        registerGlobalShortcut();

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to set custom shortcut:", error);
        return { success: false, error: message };
      }
    },
  );

  ipcMain.handle("reset-shortcut", () => {
    try {
      store.set("customShortcut", DEFAULT_SHORTCUT);
      registerGlobalShortcut();
      return { success: true, shortcut: DEFAULT_SHORTCUT };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to reset shortcut:", error);
      return { success: false, error: message };
    }
  });

  ipcMain.handle("close-settings-window", () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
  });

  // Handle media keys
  view.webContents.on("media-started-playing", () => {
    console.log("Media started playing");
  });

  view.webContents.on("media-paused", () => {
    console.log("Media paused");
  });

  // Inject CSS to hide distracting elements and Inject React Renderer
  view.webContents.on("did-finish-load", () => {
    // 1. Inject Distraction-Free CSS (Original)
    view.webContents.insertCSS(`
      /* Hide Create button */
      #buttons > ytd-button-renderer:nth-child(1) {
        display: none !important;
      }
      
      /* Hide comments section */
      #comments {
        display: none !important;
      }
      
      /* Hide notifications bell and upload icons in header */
      ytd-topbar-menu-button-renderer {
        display: none !important;
      }
      
      /* Optional: Add subtle styling for a cleaner look */
      body {
        background-color: #0f0f0f !important;
        ytd-watch-flexy {
          padding-left: 16px !important;
        }
      }
    `);

    // 2. Inject React App
    try {
      // Path to built renderer assets
      const rendererPath = path.join(app.getAppPath(), "renderer_dist");
      const cssPath = path.join(rendererPath, "assets/index.css");
      const jsPath = path.join(rendererPath, "assets/index.js");

      // Inject React CSS
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, "utf8");
        view.webContents.insertCSS(css);
        console.log("Injected React CSS");
      } else {
        console.warn("React CSS not found at:", cssPath);
      }

      // Inject React JS
      if (fs.existsSync(jsPath)) {
        const js = fs.readFileSync(jsPath, "utf8");
        view.webContents
          .executeJavaScript(
            `
                if (!document.getElementById('root')) {
                    const root = document.createElement('div');
                    root.id = 'root';
                    document.body.appendChild(root);
                    console.log('Created #root for React');
                }
            `,
          )
          .then(() => {
            view.webContents.executeJavaScript(js);
            console.log("Injected React JS");
          })
          .catch((err) => console.error("Error executing JS:", err));
      } else {
        console.warn("React JS not found at:", jsPath);
      }
    } catch (e) {
      console.error("Failed to inject renderer:", e);
    }
  });

  // Track URL changes to save session
  view.webContents.on("did-navigate-in-page", (event: Event, url: string) => {
    store.set("lastUrl", url);
  });

  view.webContents.on("did-navigate", (event: Event, url: string) => {
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
      preload: path.join(app.getAppPath(), "settings-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    parent: mainWindow,
    modal: true,
    show: false,
  });
  settingsWindow = win;

  const settingsHtmlPath = path.join(app.getAppPath(), "settings.html");
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
    mainWindowView?.webContents.send("media-play-pause");
  });

  globalShortcut.register("MediaNextTrack", () => {
    mainWindowView?.webContents.send("media-next-track");
  });

  globalShortcut.register("MediaPreviousTrack", () => {
    mainWindowView?.webContents.send("media-previous-track");
  });
}

app.whenReady().then(() => {
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
