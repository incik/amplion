import Store from "electron-store";

export const DEFAULT_SHORTCUT = "CommandOrControl+Shift+Z";

export type WindowBounds = {
  width: number;
  height: number;
  x?: number;
  y?: number;
};

export type StoreSchema = {
  windowBounds: WindowBounds;
  lastUrl: string;
  customShortcut: string;
};

export const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 500, height: 600, x: undefined, y: undefined },
    lastUrl: "https://www.youtube.com",
    customShortcut: DEFAULT_SHORTCUT,
  },
});
