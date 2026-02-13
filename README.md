# Amplion

<image width="200" src="https://github.com/incik/amplion/blob/master/amplion.png" />

A lightweight, ADHD-friendly desktop YouTube music player. Listen without distractions—minimal chrome, no comments, optional mini mode with just controls and an audio visualizer. Accessible from anywhere via a global keyboard shortcut.

## Features

- Small fixed window with YouTube
- Mini mode: hide the full YouTube UI, show only controls + visualizer
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
