import Store from "electron-store";

export const DEFAULT_SHORTCUT = "CommandOrControl+Shift+Z";

export type WindowBounds = {
  width: number;
  height: number;
  x?: number;
  y?: number;
};

export type ServiceType = "youtube" | "youtubeMusic";

export type DisplayMode = "mini" | "full";

export type StoreSchema = {
  windowBounds: WindowBounds;
  lastUrl: string; // deprecated; kept for migration
  lastUrlYouTube: string;
  lastUrlYouTubeMusic: string;
  service: ServiceType;
  customShortcut: string;
  /** Mini vs full YouTube chrome; persisted by renderer. */
  lastMode: DisplayMode;
  /** Saved when switching to YouTube Music so we can restore when switching back to YouTube. */
  lastModeBeforeYouTubeMusic: DisplayMode;
};

export const DEFAULT_URL_YOUTUBE = "https://www.youtube.com";
export const DEFAULT_URL_YOUTUBE_MUSIC = "https://music.youtube.com";

export const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: { width: 500, height: 600, x: undefined, y: undefined },
    lastUrl: DEFAULT_URL_YOUTUBE,
    lastUrlYouTube: DEFAULT_URL_YOUTUBE,
    lastUrlYouTubeMusic: DEFAULT_URL_YOUTUBE_MUSIC,
    service: "youtube",
    customShortcut: DEFAULT_SHORTCUT,
    lastMode: "full",
    lastModeBeforeYouTubeMusic: "full",
  },
});

/** Default window size when switching to YouTube Music (full display, no mini). */
export const YOUTUBE_MUSIC_WINDOW_WIDTH = 960;
export const YOUTUBE_MUSIC_WINDOW_HEIGHT = 600;
