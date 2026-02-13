import type { IpcRenderer } from "electron";
import * as constants from "./constants";
import * as styles from "./styles";

interface MiniPlayerElements {
  miniPlayer: HTMLDivElement;
  content: HTMLDivElement;
  titleEl: HTMLDivElement;
  controls: HTMLDivElement;
  playPauseBtn: HTMLButtonElement;
  prevBtn: HTMLButtonElement;
  nextBtn: HTMLButtonElement;
  toggleBtn: HTMLButtonElement;
}

export function bootstrapMiniPlayer(
  ipcRenderer: IpcRenderer,
  _constants: typeof constants,
  _styles: typeof styles
): void {
  const {
    MINI_PLAYER_MAX_ATTEMPTS,
    MINI_PLAYER_RETRY_MS,
    MINI_PLAYER_INIT_DELAY_MS,
    TITLE_UPDATE_INTERVAL_MS,
    MINI_PLAYER_HEIGHT_PADDING,
    YT_VIDEO_SELECTOR,
    YT_NEXT_BUTTON_SELECTOR,
    YT_PREV_BUTTON_SELECTOR,
    YT_TITLE_SELECTORS,
    YT_APP_SELECTOR,
  } = _constants;
  const { MINI_PLAYER_STYLES } = _styles;

  function injectMiniPlayerStyles(): void {
    const style = document.createElement("style");
    style.textContent = MINI_PLAYER_STYLES;
    document.head.appendChild(style);
  }

  function getMiniPlayerHeight(miniPlayer: HTMLDivElement): number {
    const rect = miniPlayer.getBoundingClientRect();
    return Math.ceil(rect.height) + MINI_PLAYER_HEIGHT_PADDING;
  }

  function buildMiniPlayerDOM(): MiniPlayerElements {
    const miniPlayer = document.createElement("div");
    miniPlayer.id = "custom-mini-player";

    const content = document.createElement("div");
    content.className = "mini-player-content";

    const titleDiv = document.createElement("div");
    titleDiv.className = "mini-player-title";
    titleDiv.id = "mini-player-title";
    titleDiv.textContent = "Loading...";

    const controls = document.createElement("div");
    controls.className = "mini-player-controls";

    const prevBtn = document.createElement("button");
    prevBtn.id = "mp-prev";
    prevBtn.className = "mp-btn";
    prevBtn.title = "Previous";
    prevBtn.textContent = "⏮";

    const playPauseBtn = document.createElement("button");
    playPauseBtn.id = "mp-play-pause";
    playPauseBtn.className = "mp-btn mp-btn-main";
    playPauseBtn.title = "Play/Pause";
    playPauseBtn.textContent = "▶";

    const nextBtn = document.createElement("button");
    nextBtn.id = "mp-next";
    nextBtn.className = "mp-btn";
    nextBtn.title = "Next";
    nextBtn.textContent = "⏭";

    controls.appendChild(prevBtn);
    controls.appendChild(playPauseBtn);
    controls.appendChild(nextBtn);

    content.appendChild(titleDiv);
    content.appendChild(controls);

    miniPlayer.appendChild(content);

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "mp-toggle-view";
    toggleBtn.className = "mp-floating-toggle";
    toggleBtn.title = "Toggle Mini Player / YouTube Interface";
    toggleBtn.textContent = "👁️";

    return {
      miniPlayer,
      content,
      titleEl: titleDiv,
      controls,
      playPauseBtn,
      prevBtn,
      nextBtn,
      toggleBtn,
    };
  }

  function restoreMiniPlayerState(
    miniPlayer: HTMLDivElement,
    toggleBtn: HTMLButtonElement
  ): { miniPlayerVisible: boolean } {
    const lastMode = ipcRenderer.sendSync("store-get", {
      key: "lastMode",
      defaultValue: "full",
    }) as string;
    const state = { miniPlayerVisible: lastMode === "mini" };

    if (state.miniPlayerVisible) {
      document.body.classList.add("mini-player-mode");
      toggleBtn.classList.remove("showing-youtube");
      toggleBtn.title = "Show YouTube Interface";
      setTimeout(() => {
        const height = getMiniPlayerHeight(miniPlayer);
        ipcRenderer.send("resize-window", { width: 500, height });
      }, 100);
    } else {
      miniPlayer.classList.add("hidden");
      toggleBtn.classList.add("showing-youtube");
      toggleBtn.title = "Show Mini Player";
    }

    return state;
  }

  function bindMiniPlayerEvents(
    state: { miniPlayerVisible: boolean },
    elements: MiniPlayerElements
  ): void {
    const {
      miniPlayer,
      playPauseBtn,
      prevBtn,
      nextBtn,
      toggleBtn,
    } = elements;

    playPauseBtn.addEventListener("click", () => {
      const video = document.querySelector(YT_VIDEO_SELECTOR);
      if (video) {
        const v = video as HTMLVideoElement;
        if (v.paused) v.play();
        else v.pause();
      }
    });

    prevBtn.addEventListener("click", () => {
      const prevButton = document.querySelector(YT_PREV_BUTTON_SELECTOR);
      if (prevButton) (prevButton as HTMLElement).click();
    });

    nextBtn.addEventListener("click", () => {
      const nextButton = document.querySelector(YT_NEXT_BUTTON_SELECTOR);
      if (nextButton) (nextButton as HTMLElement).click();
    });

    toggleBtn.addEventListener("click", () => {
      state.miniPlayerVisible = !state.miniPlayerVisible;

      if (state.miniPlayerVisible) {
        miniPlayer.classList.remove("hidden");
        document.body.classList.add("mini-player-mode");
        toggleBtn.classList.remove("showing-youtube");
        toggleBtn.title = "Show YouTube Interface";
        setTimeout(() => {
          const height = getMiniPlayerHeight(miniPlayer);
          ipcRenderer.send("resize-window", { width: 500, height });
        }, 50);
        ipcRenderer.send("store-set", { key: "lastMode", value: "mini" });
      } else {
        miniPlayer.classList.add("hidden");
        document.body.classList.remove("mini-player-mode");
        toggleBtn.classList.add("showing-youtube");
        toggleBtn.title = "Show Mini Player";
        ipcRenderer.send("resize-window", { width: 500, height: 600 });
        ipcRenderer.send("store-set", { key: "lastMode", value: "full" });
      }
    });
  }

  function startTitleAndPlayPauseSync(
    elements: MiniPlayerElements,
    getMiniPlayerVisible: () => boolean
  ): void {
    const { miniPlayer, titleEl, playPauseBtn } = elements;

    function updateTitle(): void {
      const titleElement = document.querySelector(YT_TITLE_SELECTORS);
      if (titleElement) {
        titleEl.textContent = titleElement.textContent?.trim() ?? "";
      }
      if (getMiniPlayerVisible()) {
        setTimeout(() => {
          const height = getMiniPlayerHeight(miniPlayer);
          ipcRenderer.send("resize-window", { width: 500, height });
        }, 50);
      }
    }

    function updatePlayPauseButton(): void {
      const video = document.querySelector(YT_VIDEO_SELECTOR);
      if (video) {
        playPauseBtn.textContent = (video as HTMLVideoElement).paused
          ? "▶"
          : "⏸";
      }
    }

    playPauseBtn.addEventListener("click", updatePlayPauseButton);

    updateTitle();
    updatePlayPauseButton();

    setInterval(updateTitle, TITLE_UPDATE_INTERVAL_MS);

    const video = document.querySelector(YT_VIDEO_SELECTOR);
    if (video) {
      video.addEventListener("play", updatePlayPauseButton);
      video.addEventListener("pause", updatePlayPauseButton);
    }

    const observer = new MutationObserver(() => {
      updateTitle();
      updatePlayPauseButton();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function createMiniPlayer(): void {
    if (document.getElementById("custom-mini-player")) {
      console.log("Mini player already exists");
      return;
    }

    console.log("Creating mini player...");

    const elements = buildMiniPlayerDOM();
    injectMiniPlayerStyles();
    document.body.appendChild(elements.miniPlayer);
    document.body.appendChild(elements.toggleBtn);

    const state = restoreMiniPlayerState(
      elements.miniPlayer,
      elements.toggleBtn
    );
    bindMiniPlayerEvents(state, elements);
    startTitleAndPlayPauseSync(elements, () => state.miniPlayerVisible);
  }

  function tryCreateMiniPlayer(attempts = 0): void {
    if (attempts >= MINI_PLAYER_MAX_ATTEMPTS) {
      console.log(
        "Failed to create mini player after",
        MINI_PLAYER_MAX_ATTEMPTS,
        "attempts"
      );
      return;
    }

    if (document.body && document.querySelector(YT_APP_SELECTOR)) {
      console.log("YouTube app detected, creating mini player...");
      createMiniPlayer();
    } else {
      console.log(
        "YouTube not ready yet, retrying in",
        MINI_PLAYER_RETRY_MS,
        "ms... (attempt",
        attempts + 1,
        ")"
      );
      setTimeout(
        () => tryCreateMiniPlayer(attempts + 1),
        MINI_PLAYER_RETRY_MS
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      console.log("DOMContentLoaded fired");
      setTimeout(() => tryCreateMiniPlayer(), MINI_PLAYER_INIT_DELAY_MS);
    });
  } else {
    console.log("DOM already loaded, attempting to create mini player");
    setTimeout(() => tryCreateMiniPlayer(), MINI_PLAYER_INIT_DELAY_MS);
  }
}
