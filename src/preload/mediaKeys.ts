import type { IpcRenderer } from "electron";
import * as constants from "./constants";

export function initMediaKeys(
  ipcRenderer: IpcRenderer,
  _constants: typeof constants
): void {
  const {
    YT_VIDEO_SELECTOR,
    YT_NEXT_BUTTON_SELECTOR,
    YT_PREV_BUTTON_SELECTOR,
  } = _constants;

  console.log("Initializing media keys...");

  ipcRenderer.on("media-play-pause", () => {
    const video = document.querySelector(YT_VIDEO_SELECTOR);
    if (video) {
      if ((video as HTMLVideoElement).paused) {
        (video as HTMLVideoElement).play();
      } else {
        (video as HTMLVideoElement).pause();
      }
    }
  });

  ipcRenderer.on("media-next-track", () => {
    const nextButton = document.querySelector(YT_NEXT_BUTTON_SELECTOR);
    if (nextButton) (nextButton as HTMLElement).click();
  });

  ipcRenderer.on("media-previous-track", () => {
    const prevButton = document.querySelector(YT_PREV_BUTTON_SELECTOR);
    if (prevButton) (prevButton as HTMLElement).click();
  });
}
