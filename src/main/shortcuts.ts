import type { BrowserWindow } from "electron";
import { globalShortcut } from "electron";
import type Store from "electron-store";
import type { StoreSchema } from "./store";
import { DEFAULT_SHORTCUT, store } from "./store";

export function registerGlobalShortcuts(
  getMainWindow: () => BrowserWindow | undefined,
  onToggle: () => void,
): void {
  globalShortcut.unregisterAll();

  const shortcut = store.get("customShortcut", DEFAULT_SHORTCUT);
  const ret = globalShortcut.register(shortcut, onToggle);

  if (!ret) {
    console.log("Global shortcut registration failed for:", shortcut);
    if (shortcut !== DEFAULT_SHORTCUT) {
      console.log("Falling back to default shortcut");
      store.set("customShortcut", DEFAULT_SHORTCUT);
      globalShortcut.register(DEFAULT_SHORTCUT, onToggle);
    }
  } else {
    console.log("Global shortcut registered:", shortcut);
  }

  globalShortcut.register("MediaPlayPause", () => {
    getMainWindow()?.webContents.send("media-play-pause");
  });

  globalShortcut.register("MediaNextTrack", () => {
    getMainWindow()?.webContents.send("media-next-track");
  });

  globalShortcut.register("MediaPreviousTrack", () => {
    getMainWindow()?.webContents.send("media-previous-track");
  });
}
