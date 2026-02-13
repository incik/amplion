/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI: {
      onMediaPlayPause: (callback: () => void) => void;
      onMediaNextTrack: (callback: () => void) => void;
      onMediaPreviousTrack: (callback: () => void) => void;
      resizeWindow: (width: number, height: number) => void;
      isYouTubeReady: () => boolean;
      getYouTubeTitle: () => string;
      isVideoPaused: () => boolean;
      togglePlayback: () => void;
      getVideoDuration: () => number;
      getVideoCurrentTime: () => number;
    };
    amplionAppStore: {
      get: (key: string, defaultValue?: unknown) => unknown;
      set: (key: string, value: unknown) => void;
    };
  }
}

export {};
