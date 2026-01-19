const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Media key handlers
    onMediaPlayPause: (callback) => ipcRenderer.on('media-play-pause', callback),
    onMediaNextTrack: (callback) => ipcRenderer.on('media-next-track', callback),
    onMediaPreviousTrack: (callback) => ipcRenderer.on('media-previous-track', callback),

    // Window management
    resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),

    // YouTube interaction helpers
    togglePlayback: () => {
        const video = document.querySelector('video');
        if (video) {
            if (video.paused) video.play();
            else video.pause();
            return !video.paused;
        }
        return false;
    },
    isVideoPaused: () => {
        const video = document.querySelector('video');
        return video ? video.paused : true;
    },
    getYouTubeTitle: () => {
        const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
            document.querySelector('h1.title');
        return titleEl ? titleEl.textContent.trim() : 'Loading...';
    },
    clickYouTubeButton: (selector) => {
        const button = document.querySelector(selector);
        if (button) button.click();
    },

    // Check if YouTube is ready
    isYouTubeReady: () => {
        return document.body && document.querySelector('ytd-app');
    }
});

// Expose store for session persistence via IPC
contextBridge.exposeInMainWorld('store', {
    get: (key, defaultValue) => ipcRenderer.sendSync('store-get', { key, defaultValue }),
    set: (key, value) => ipcRenderer.send('store-set', { key, value }),
});

// Initialize media key listeners
function initMediaKeys() {
    console.log('Initializing media keys...');

    // Listen for media key events from main process
    ipcRenderer.on('media-play-pause', () => {
        const video = document.querySelector('video');
        if (video) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    });

    ipcRenderer.on('media-next-track', () => {
        const nextButton = document.querySelector('.ytp-next-button');
        if (nextButton) nextButton.click();
    });

    ipcRenderer.on('media-previous-track', () => {
        const prevButton = document.querySelector('.ytp-prev-button');
        if (prevButton) prevButton.click();
    });
}

// Initialize media keys immediately
initMediaKeys();
