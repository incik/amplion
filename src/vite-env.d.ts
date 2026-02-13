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
  }
}

export {};
