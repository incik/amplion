/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI: {
      onMediaPlayPause: (callback: () => void) => () => void;
      onMediaNextTrack: (callback: () => void) => () => void;
      onMediaPreviousTrack: (callback: () => void) => () => void;
      resizeWindow: (width: number, height: number) => void;
      isYouTubeReady: () => boolean;
      getYouTubeTitle: () => string;
      isVideoPaused: () => boolean;
      togglePlayback: () => boolean;
      getVideoDuration: () => number;
      getVideoCurrentTime: () => number;
      clickYouTubeButton: (selector: string) => void;
    };
    amplionAppStore: {
      get: (key: string, defaultValue?: unknown) => unknown;
      set: (key: string, value: unknown) => void;
    };
    settingsAPI: {
      getCurrentShortcut: () => Promise<string>;
      setCustomShortcut: (shortcut: string) => Promise<{
        success: boolean;
        error?: string;
      }>;
      resetToDefault: () => Promise<{
        success: boolean;
        shortcut?: string;
        error?: string;
      }>;
      closeWindow: () => Promise<void>;
    };
  }
}

export {};
