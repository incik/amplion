# YouTube Music Player

A lightweight macOS desktop app for distraction-free YouTube music listening.

## Features

- 🎵 Compact 500x600 non-resizable window
- 🎛️ **Mini player overlay** - Always visible controls with video title
- 👁️ **Mode toggle button** - Switch between mini player mode and full YouTube interface
- ⌨️ Global hotkey (Cmd+Shift+Y) to show/hide app
- 🎹 System media keys support (Play/Pause, Next, Previous)
- 🚫 **Element blocking** - Hides Create button, comments, and notifications
- 💾 Remembers window position
- 🚀 Fast and lightweight

## Quick Start

```bash
npm install
npm start
```

## Keyboard Shortcuts

- **Cmd+Shift+Y** - Toggle show/hide window
- **Media Play/Pause** - Toggle playback
- **Media Next** - Next video
- **Media Previous** - Previous video

## Mini Player Controls

**Mini Player Mode (default):**

- Floating mini player at the top shows current video title
- ⏮ Previous track
- ▶/⏸ Play/Pause
- ⏭ Next track
- YouTube header is hidden for distraction-free listening

**Toggle Button (top-right 👁️):**

- Click to switch between mini player mode and full YouTube interface
- In full YouTube mode: mini player hides, YouTube header shows (access search, etc.)
- Button turns red when showing full YouTube interface

## Build for Distribution

**macOS:**

```bash
npm run build
```

**Windows (x64 and ARM64):**

```bash
npm run build -- --win
```

Outputs to `dist/` directory.

## Platform Differences

### macOS

- Closing window hides it, music continues playing
- Click dock icon to show window again
- Cmd+Q to fully quit

### Windows

- Closing window quits the app
- Use global hotkey (Ctrl+Shift+Y) to hide/show in the `dist/` folder.

## License

MIT
