import type { BrowserWindow } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { ipcMain } from "electron";
import type Store from "electron-store";
import type { StoreSchema } from "./store";
import { DEFAULT_SHORTCUT } from "./store";

export function registerIpcHandlers(
  storeInstance: Store<StoreSchema>,
  getMainWindow: () => BrowserWindow | undefined,
  getSettingsWindow: () => BrowserWindow | null,
  onShortcutChange: () => void,
): void {
  ipcMain.on(
    "resize-window",
    (
      _event: IpcMainEvent,
      { width, height }: { width: number; height: number },
    ) => {
      const win = getMainWindow();
      if (win) {
        const currentBounds = win.getBounds();
        const newY = currentBounds.y + (currentBounds.height - height) / 2;
        win.setBounds(
          {
            x: currentBounds.x,
            y: Math.round(newY),
            width,
            height,
          },
          true,
        );
      }
    },
  );

  ipcMain.on(
    "store-set",
    (_event: IpcMainEvent, { key, value }: { key: string; value: unknown }) => {
      storeInstance.set(key, value);
    },
  );

  ipcMain.on(
    "store-get",
    (
      event: IpcMainEvent,
      { key, defaultValue }: { key: string; defaultValue: unknown },
    ) => {
      event.returnValue = storeInstance.get(key, defaultValue);
    },
  );

  ipcMain.handle("get-current-shortcut", () => {
    return storeInstance.get("customShortcut", DEFAULT_SHORTCUT);
  });

  ipcMain.handle(
    "set-custom-shortcut",
    (_event: IpcMainInvokeEvent, shortcut: string) => {
      try {
        storeInstance.set("customShortcut", shortcut);
        onShortcutChange();
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
      storeInstance.set("customShortcut", DEFAULT_SHORTCUT);
      onShortcutChange();
      return { success: true, shortcut: DEFAULT_SHORTCUT };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to reset shortcut:", error);
      return { success: false, error: message };
    }
  });

  ipcMain.handle("close-settings-window", () => {
    const win = getSettingsWindow();
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });
}
