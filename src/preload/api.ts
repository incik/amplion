import type { ContextBridge, IpcRenderer } from "electron";
import { YT_TITLE_SELECTORS, YT_VIDEO_SELECTOR } from "./constants";

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
export function exposeAPI(
  contextBridge: ContextBridge,
  ipcRenderer: IpcRenderer,
): void {
  contextBridge.exposeInMainWorld("electronAPI", {
    onMediaPlayPause: (callback: () => void) =>
      ipcRenderer.on("media-play-pause", callback),
    onMediaNextTrack: (callback: () => void) =>
      ipcRenderer.on("media-next-track", callback),
    onMediaPreviousTrack: (callback: () => void) =>
      ipcRenderer.on("media-previous-track", callback),
    resizeWindow: (width: number, height: number) =>
      ipcRenderer.send("resize-window", { width, height }),
    isYouTubeReady: () =>
      Boolean(document.body && document.querySelector("ytd-app")),
    getYouTubeTitle: () => {
      const title = document.querySelector(YT_TITLE_SELECTORS);
      return title ? title.textContent : "";
    },
    isVideoPaused: () => {
      const video = document.querySelector(YT_VIDEO_SELECTOR);
      return video ? (video as HTMLVideoElement).paused : false;
    },
    togglePlayback: () => {
      const video = document.querySelector(YT_VIDEO_SELECTOR);
      if (video) {
        const v = video as HTMLVideoElement;
        if (v.paused) v.play();
        else v.pause();
      }
    },
    getVideoDuration: () => {
      const video = document.querySelector(YT_VIDEO_SELECTOR);
      if (video) {
        const v = video as HTMLVideoElement;
        return v.duration;
      }
      return 0;
    },
    getVideoCurrentTime: () => {
      const video = document.querySelector(YT_VIDEO_SELECTOR);
      if (video) {
        const v = video as HTMLVideoElement;
        return v.currentTime;
      }
      return 0;
    },
  });
  console.log("isYouTubeReady injected");
  // Expose store for session persistence via IPC
  contextBridge.exposeInMainWorld("amplionAppStore", {
    get: (key: string, defaultValue?: unknown) =>
      ipcRenderer.sendSync("store-get", { key, defaultValue }),
    set: (key: string, value: unknown) =>
      ipcRenderer.send("store-set", { key, value }),
  });
}
