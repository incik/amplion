# Amplion

<p align="center">
    <image width="200" src="https://github.com/incik/amplion/blob/master/amplion.png" />
</p>

A lightweight, ADHD-friendly desktop player for YouTube and YouTube Music. Listen without distractions—minimal chrome, no comments, optional mini mode with just controls and an audio visualizer. Accessible from anywhere via a global keyboard shortcut.

 <image src="https://github.com/incik/amplion/blob/master/images/screen.png" />

## Features

- Switch between YouTube and YouTube Music via a two-button selector
- Small fixed window; YouTube Music opens in full mode at a wider window (960×600)
- Mini mode (YouTube only): hide the full YouTube UI, show only controls + visualizer
- Global shortcut (default: `Cmd/Ctrl+Shift+Z`) to show/hide
- Media keys support (play/pause, next, previous)
- Settings: customize the shortcut via **Settings** (Cmd+,)

## Requirements

- [Bun](https://bun.sh)

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

Output goes to `dist/` (DMG on macOS, NSIS on Windows).

## License

MIT
