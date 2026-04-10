import type { Event, Input } from "electron";
import { app, BrowserWindow } from "electron";
import path from "path";
import type Store from "electron-store";
import type { StoreSchema } from "./store";
import { injectYouTubeAndRenderer, injectYouTubeMusicShell } from "./inject";

function isYouTubeMusicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "music.youtube.com";
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

function persistUrlByHost(store: Store<StoreSchema>, url: string): void {
  if (isYouTubeMusicUrl(url)) {
    store.set("lastUrlYouTubeMusic", url);
  } else if (isYouTubeUrl(url)) {
    store.set("lastUrlYouTube", url);
  }
}

export function createMainWindow(
  store: Store<StoreSchema>,
  getIsQuitting: () => boolean,
): BrowserWindow {
  const windowBounds = store.get("windowBounds");
  windowBounds.height = 600;

  const appPath = app.getAppPath();
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
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: iconPath,
  });

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
    if (process.platform === "darwin" && !getIsQuitting()) {
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
    persistUrlByHost(store, url);
  });

  win.webContents.on("did-navigate", (_event: Event, url: string) => {
    persistUrlByHost(store, url);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isYouTubeMusicUrl(url) || isYouTubeUrl(url)) {
      win.webContents.loadURL(url);
      persistUrlByHost(store, url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  return win;
}

export function createSettingsWindow(
  _store: Store<StoreSchema>,
  getParent: () => BrowserWindow,
  getSettingsWindow: () => BrowserWindow | null,
  setSettingsWindow: (w: BrowserWindow | null) => void,
): void {
  if (getSettingsWindow() && !getSettingsWindow()!.isDestroyed()) {
    getSettingsWindow()!.focus();
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
      preload: path.join(__dirname, "..", "settings-preload", "settings-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    parent: getParent(),
    modal: true,
    show: false,
  });
  setSettingsWindow(win);

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

  win.webContents.on("before-input-event", (_event: Event, input: Input) => {
    if (input.key === "Escape") {
      win.close();
    }
  });

  win.on("closed", () => {
    setSettingsWindow(null);
  });
}
