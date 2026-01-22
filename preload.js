const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  onMediaPlayPause: (callback) => ipcRenderer.on("media-play-pause", callback),
  onMediaNextTrack: (callback) => ipcRenderer.on("media-next-track", callback),
  onMediaPreviousTrack: (callback) =>
    ipcRenderer.on("media-previous-track", callback),
  resizeWindow: (width, height) =>
    ipcRenderer.send("resize-window", { width, height }),
});

// Expose store for session persistence via IPC
contextBridge.exposeInMainWorld("store", {
  get: (key, defaultValue) =>
    ipcRenderer.sendSync("store-get", { key, defaultValue }),
  set: (key, value) => ipcRenderer.send("store-set", { key, value }),
});

// Function to initialize media key listeners
function initMediaKeys() {
  console.log("Initializing media keys...");

  // Listen for media key events from main process
  ipcRenderer.on("media-play-pause", () => {
    const video = document.querySelector("video");
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  });

  ipcRenderer.on("media-next-track", () => {
    const nextButton = document.querySelector(".ytp-next-button");
    if (nextButton) nextButton.click();
  });

  ipcRenderer.on("media-previous-track", () => {
    const prevButton = document.querySelector(".ytp-prev-button");
    if (prevButton) prevButton.click();
  });
}

// Initialize media keys immediately
initMediaKeys();

// Try to create mini player with retry logic
function tryCreateMiniPlayer(attempts = 0) {
  const maxAttempts = 10;

  if (attempts >= maxAttempts) {
    console.log("Failed to create mini player after", maxAttempts, "attempts");
    return;
  }

  // Check if YouTube's main content is loaded
  if (document.body && document.querySelector("ytd-app")) {
    console.log("YouTube app detected, creating mini player...");
    createMiniPlayer();
  } else {
    console.log(
      "YouTube not ready yet, retrying in 500ms... (attempt",
      attempts + 1,
      ")",
    );
    setTimeout(() => tryCreateMiniPlayer(attempts + 1), 500);
  }
}

// Start trying to create mini player based on document state
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");
    setTimeout(() => tryCreateMiniPlayer(), 1000);
  });
} else {
  // DOM already loaded
  console.log("DOM already loaded, attempting to create mini player");
  setTimeout(() => tryCreateMiniPlayer(), 1000);
}

function createMiniPlayer() {
  // Check if mini player already exists
  if (document.getElementById("custom-mini-player")) {
    console.log("Mini player already exists");
    return;
  }

  console.log("Creating mini player...");

  // Create mini player container using DOM methods (not innerHTML due to Trusted Types)
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

  // Create buttons (no hide video button in mini player anymore)
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

  // Assemble the structure
  controls.appendChild(prevBtn);
  controls.appendChild(playPauseBtn);
  controls.appendChild(nextBtn);

  content.appendChild(titleDiv);
  content.appendChild(controls);

  miniPlayer.appendChild(content);

  // Create floating toggle button (outside mini player)
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "mp-toggle-view";
  toggleBtn.className = "mp-floating-toggle";
  toggleBtn.title = "Toggle Mini Player / YouTube Interface";
  toggleBtn.textContent = "👁️";

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    #custom-mini-player {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999999 !important;
      background: rgba(15, 15, 15, 0.98) !important;
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 12px 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
      border: 2px solid rgba(255, 255, 255, 0.3) !important;
      min-width: 300px;
      max-width: 450px;
      pointer-events: auto !important;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    #custom-mini-player.hidden {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
      pointer-events: none;
    }

    .mp-floating-toggle {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 99999999 !important;
      background: rgba(15, 15, 15, 0.95) !important;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3) !important;
      color: #fff;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.2s ease;
      outline: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      visibility: visible !important;
    }

    .mp-floating-toggle:hover {
      background: rgba(255, 255, 255, 0.2) !important;
      transform: scale(1.1);
    }

    .mp-floating-toggle:active {
      transform: scale(0.95);
    }

    .mp-floating-toggle.showing-youtube {
      background: rgba(255, 59, 48, 0.4) !important;
      border-color: rgba(255, 59, 48, 0.6) !important;
    }

    body.mini-player-mode ytd-app {
      visibility: hidden !important;
      height: 0 !important;
    }

    .mini-player-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mini-player-title {
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
      max-width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.3;
    }

    .mini-player-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }

    .mp-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
      outline: none;
    }

    .mp-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .mp-btn:active {
      transform: scale(0.95);
    }

    .mp-btn-main {
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(miniPlayer);
  document.body.appendChild(toggleBtn);

  // Function to calculate the ideal window height for mini player mode
  function getMiniPlayerHeight() {
    const rect = miniPlayer.getBoundingClientRect();
    // Add padding: 32px for top/bottom margins, plus 80px for eye button area
    return Math.ceil(rect.height) + 112;
  }

  // Restore last mode from store or default to full YouTube mode
  const lastMode = ipcRenderer.sendSync("store-get", {
    key: "lastMode",
    defaultValue: "full",
  });
  let miniPlayerVisible;

  if (lastMode === "mini") {
    // Start in mini player mode
    document.body.classList.add("mini-player-mode");
    miniPlayerVisible = true;
    toggleBtn.classList.remove("showing-youtube");
    toggleBtn.title = "Show YouTube Interface";
    // Resize to mini mode with dynamic height
    setTimeout(() => {
      const height = getMiniPlayerHeight();
      ipcRenderer.send("resize-window", { width: 500, height });
    }, 100);
  } else {
    // Start in full YouTube mode (mini player hidden)
    miniPlayer.classList.add("hidden");
    toggleBtn.classList.add("showing-youtube");
    miniPlayerVisible = false;
    toggleBtn.title = "Show Mini Player";
  }

  // Get title element reference
  const titleEl = document.getElementById("mini-player-title");

  // Update title periodically
  function updateTitle() {
    const titleElement =
      document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
      document.querySelector("h1.title");
    if (titleElement) {
      titleEl.textContent = titleElement.textContent.trim();
    }
  }

  // Update play/pause button state
  function updatePlayPauseButton() {
    const video = document.querySelector("video");
    if (video) {
      playPauseBtn.textContent = video.paused ? "▶" : "⏸";
    }
  }

  // Play/Pause
  playPauseBtn.addEventListener("click", () => {
    const video = document.querySelector("video");
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
      updatePlayPauseButton();
    }
  });

  // Previous
  prevBtn.addEventListener("click", () => {
    const prevButton = document.querySelector(".ytp-prev-button");
    if (prevButton) prevButton.click();
  });

  // Next
  nextBtn.addEventListener("click", () => {
    const nextButton = document.querySelector(".ytp-next-button");
    if (nextButton) nextButton.click();
  });

  // Toggle between mini player mode and full YouTube interface
  toggleBtn.addEventListener("click", () => {
    miniPlayerVisible = !miniPlayerVisible;

    if (miniPlayerVisible) {
      // Show mini player, hide YouTube header
      miniPlayer.classList.remove("hidden");
      document.body.classList.add("mini-player-mode");
      toggleBtn.classList.remove("showing-youtube");
      toggleBtn.title = "Show YouTube Interface";
      // Resize window to compact size with dynamic height
      setTimeout(() => {
        const height = getMiniPlayerHeight();
        ipcRenderer.send("resize-window", { width: 500, height });
      }, 50);
      // Save mode preference
      ipcRenderer.send("store-set", { key: "lastMode", value: "mini" });
    } else {
      // Hide mini player, show YouTube header
      miniPlayer.classList.add("hidden");
      document.body.classList.remove("mini-player-mode");
      toggleBtn.classList.add("showing-youtube");
      toggleBtn.title = "Show Mini Player";
      // Resize window back to full size
      ipcRenderer.send("resize-window", { width: 500, height: 600 });
      // Save mode preference
      ipcRenderer.send("store-set", { key: "lastMode", value: "full" });
    }
  });

  // Update title on page changes
  updateTitle();
  setInterval(updateTitle, 2000);

  // Also adjust window height when title changes (in mini mode)
  const originalUpdateTitle = updateTitle;
  updateTitle = function () {
    originalUpdateTitle();
    if (miniPlayerVisible) {
      setTimeout(() => {
        const height = getMiniPlayerHeight();
        ipcRenderer.send("resize-window", { width: 500, height });
      }, 50);
    }
  };

  // Update play/pause button on video state changes
  const video = document.querySelector("video");
  if (video) {
    video.addEventListener("play", updatePlayPauseButton);
    video.addEventListener("pause", updatePlayPauseButton);
    updatePlayPauseButton();
  }

  // Also update on navigation
  const observer = new MutationObserver(() => {
    updateTitle();
    updatePlayPauseButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
