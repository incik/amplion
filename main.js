const { app, BrowserWindow, globalShortcut, Menu, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let settingsWindow;
let isQuitting = false;
const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+~';

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

  // Intercept close event - platform-specific behavior
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      // macOS: hide instead of closing so music keeps playing (unless actually quitting)
      event.preventDefault();
      mainWindow.hide();
    }
    // Windows/Linux: allow normal close behavior
  });

  // Save window position when hidden (macOS) or closing (Windows/Linux)
  mainWindow.on('hide', () => {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  });

  mainWindow.on('close', () => {
    if (process.platform !== 'darwin') {
      const bounds = mainWindow.getBounds();
      store.set('windowBounds', bounds);
    }
  });

  // Handle window resize requests from renderer
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

  // IPC handlers for settings window
  ipcMain.handle('get-current-shortcut', () => {
    return store.get('customShortcut', DEFAULT_SHORTCUT);
  });

  ipcMain.handle('set-custom-shortcut', (event, shortcut) => {
    try {
      // Save to store
      store.set('customShortcut', shortcut);

      // Re-register global shortcuts with new shortcut
      registerGlobalShortcut();

      return { success: true };
    } catch (error) {
      console.error('Failed to set custom shortcut:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reset-shortcut', () => {
    try {
      store.set('customShortcut', DEFAULT_SHORTCUT);
      registerGlobalShortcut();
      return { success: true, shortcut: DEFAULT_SHORTCUT };
    } catch (error) {
      console.error('Failed to reset shortcut:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('close-settings-window', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
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

function createSettingsWindow() {
  // If settings window already exists, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Settings',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'settings-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    parent: mainWindow,
    modal: true,
    show: false,
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
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

function registerGlobalShortcut() {
  // Unregister existing shortcut first
  globalShortcut.unregisterAll();

  // Get custom shortcut from store or use default
  const shortcut = store.get('customShortcut', DEFAULT_SHORTCUT);

  // Register window toggle shortcut
  const ret = globalShortcut.register(shortcut, () => {
    toggleWindow();
  });

  if (!ret) {
    console.log('Global shortcut registration failed for:', shortcut);
    // Fall back to default if custom shortcut fails
    if (shortcut !== DEFAULT_SHORTCUT) {
      console.log('Falling back to default shortcut');
      store.set('customShortcut', DEFAULT_SHORTCUT);
      globalShortcut.register(DEFAULT_SHORTCUT, () => {
        toggleWindow();
      });
    }
  } else {
    console.log('Global shortcut registered:', shortcut);
  }

  // Register media key shortcuts
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
}

app.whenReady().then(() => {
  createWindow();

  // Create application menu
  const isMac = process.platform === 'darwin';

  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CommandOrControl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // File menu (Windows/Linux)
    ...(!isMac ? [{
      label: 'File',
      submenu: [
        {
          label: 'Settings...',
          accelerator: 'CommandOrControl+,',
          click: () => createSettingsWindow()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Register global shortcuts
  registerGlobalShortcut();

  app.on('activate', () => {
    // macOS only: clicking the dock icon should show the window if hidden
    if (process.platform === 'darwin') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      } else if (BrowserWindow.getAllWindows().length === 0) {
        // If no window exists, create one
        createWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
