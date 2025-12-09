const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

function createWindow() {
  // Get saved window position or use defaults
  const windowBounds = store.get('windowBounds', {
    width: 500,
    height: 600,
    x: undefined,
    y: undefined
  });

  // Always start at 600px height (full YouTube mode)
  windowBounds.height = 600;

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'YouTube Music Player',
    backgroundColor: '#000000',
    show: false, // Don't show until ready
  });

  // Load YouTube or last visited URL
  const lastUrl = store.get('lastUrl', 'https://www.youtube.com');
  mainWindow.loadURL(lastUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools with F12 for debugging
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Intercept close event - hide instead of closing so music keeps playing
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Save window position when hidden
  mainWindow.on('hide', () => {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  });

  // Handle window resize requests from renderer
  const { ipcMain } = require('electron');
  ipcMain.on('resize-window', (event, { width, height }) => {
    if (mainWindow) {
      const currentBounds = mainWindow.getBounds();
      // Center the window vertically when resizing
      const newY = currentBounds.y + (currentBounds.height - height) / 2;
      mainWindow.setBounds({
        x: currentBounds.x,
        y: Math.round(newY),
        width: width,
        height: height
      }, true); // animate = true
    }
  });

  // Handle store operations from renderer
  ipcMain.on('store-set', (event, { key, value }) => {
    store.set(key, value);
  });

  ipcMain.on('store-get', (event, { key, defaultValue }) => {
    event.returnValue = store.get(key, defaultValue);
  });

  // Handle media keys
  mainWindow.webContents.on('media-started-playing', () => {
    console.log('Media started playing');
  });

  mainWindow.webContents.on('media-paused', () => {
    console.log('Media paused');
  });

  // Inject CSS to hide distracting elements
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(`
      /* Hide Create button */
      #buttons > ytd-button-renderer:nth-child(1) {
        display: none !important;
      }
      
      /* Hide comments section */
      #comments {
        display: none !important;
      }
      
      /* Hide related/suggested videos on the right side (optional) */
      /* Uncomment if you want to hide these as well:
      #related {
        display: none !important;
      }
      */
      
      /* Hide shorts section (optional) */
      /* Uncomment if you want to hide these as well:
      ytd-reel-shelf-renderer {
        display: none !important;
      }
      */
      
      /* Hide notifications bell and upload icons in header */
      ytd-topbar-menu-button-renderer {
        display: none !important;
      }
      
      /* Optional: Add subtle styling for a cleaner look */
      body {
        background-color: #0f0f0f !important;
        ytd-watch-flexy {
          padding-left: 16px !important;
        }
      }
    `);
  });

  // Track URL changes to save session
  mainWindow.webContents.on('did-navigate-in-page', (event, url) => {
    store.set('lastUrl', url);
  });

  mainWindow.webContents.on('did-navigate', (event, url) => {
    store.set('lastUrl', url);
  });
}

function toggleWindow() {
  // If window doesn't exist or has been destroyed, recreate it
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  // If window is focused (visible on current desktop), hide it
  // Otherwise (hidden or on another desktop), show it on current desktop
  if (mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    // Make window appear on current space/desktop
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.show();
    mainWindow.focus();
    // Reset to normal behavior after showing
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setVisibleOnAllWorkspaces(false);
      }
    }, 100);
  }
}

app.whenReady().then(() => {
  createWindow();

  // Register global shortcut: CommandOrControl+Shift+Y
  const ret = globalShortcut.register('CommandOrControl+Shift+Y', () => {
    toggleWindow();
  });

  if (!ret) {
    console.log('Global shortcut registration failed');
  }

  // Register media key shortcuts (macOS media keys)
  globalShortcut.register('MediaPlayPause', () => {
    if (mainWindow) {
      mainWindow.webContents.send('media-play-pause');
    }
  });

  globalShortcut.register('MediaNextTrack', () => {
    if (mainWindow) {
      mainWindow.webContents.send('media-next-track');
    }
  });

  globalShortcut.register('MediaPreviousTrack', () => {
    if (mainWindow) {
      mainWindow.webContents.send('media-previous-track');
    }
  });

  app.on('activate', () => {
    // On macOS, clicking the dock icon should show the window if hidden
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    } else if (BrowserWindow.getAllWindows().length === 0) {
      // If no window exists, create one
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
