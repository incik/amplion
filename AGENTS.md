# Amplion — Agent Reference

## What This Project Is

**Amplion** is a **lightweight, ADHD-friendly desktop YouTube music player**. It is an Electron app that loads YouTube in a small, fixed-size window and layers a custom mini-player UI on top. The goal is distraction-free listening: minimal chrome, no comments/notifications, and optional "mini mode" that hides the full YouTube interface and shows only controls and an audio visualizer. The player is accessible anywhere via a simple global keyboard shortcut (show/hide).

- **Product name:** Amplion
- **App ID:** `cz.incik.amplion`
- **Stack:** Electron (main process in TypeScript), React (renderer in TypeScript), Vite for renderer build, Bun for preload build and scripts/tooling.

---

## Architecture Overview

1. **Main process** (`src/main/`)
   - **main.ts** — Entry point: creates main window, registers IPC, app menu, global shortcuts, handles activate/quit.
   - **windows.ts** — `createMainWindow()` and `createSettingsWindow()`; loads YouTube, sets up `did-finish-load` → injection; preload path: `build/preload/preload.js`.
   - **inject.ts** — `injectYouTubeAndRenderer()`: injects distraction-free CSS, then React bundle (CSS + JS) from `renderer_dist/`; ensures `#root` exists.
   - **ipc.ts** — IPC handlers: `resize-window`, `store-get`, `store-set`, `get-current-shortcut`, `set-custom-shortcut`, `reset-shortcut`, `close-settings-window`.
   - **shortcuts.ts** — Global shortcut (configurable, default `CommandOrControl+Shift+Z`) and media keys (MediaPlayPause, MediaNextTrack, MediaPreviousTrack) forwarded to renderer via IPC.
   - **store.ts** — `electron-store` with schema: `windowBounds`, `lastUrl`, `customShortcut`.
   - **menu.ts** — App menu (macOS/Windows) with Settings (Cmd+,).
   - **Persistence:** `electron-store`. Renderer also uses `lastMode` (mini/full) via store.
   - **macOS:** Close hides the window (music keeps playing); **Windows:** Close quits the app.
   - **Settings window:** Separate window (TypeScript + React) loaded from `renderer_dist/src/settings/index.html`; preload: `build/settings-preload/settings-preload.js`; for shortcut configuration.

2. **Preload** (`src/preload/`) — TypeScript, built to `build/preload/preload.js`
   - **index.ts** — Loads api, mediaKeys; exposes API and initializes media key listeners.
   - **api.ts** — `contextBridge.exposeInMainWorld`:
     - **`window.electronAPI`:** `resizeWindow(w, h)`, `isYouTubeReady()`, `getYouTubeTitle()`, `isVideoPaused()`, `togglePlayback()`, `getVideoDuration()`, `getVideoCurrentTime()`, `clickYouTubeButton(selector)`, and media key listeners: `onMediaPlayPause`, `onMediaNextTrack`, `onMediaPreviousTrack` (each returns cleanup fn).
     - **`window.amplionAppStore`:** `get(key, defaultValue)`, `set(key, value)` (IPC to main).
   - **mediaKeys.ts** — Registers IPC listeners for `media-play-pause`, `media-next-track`, `media-previous-track` and operates on page DOM (`video`, `.ytp-next-button`, `.ytp-prev-button`).
   - **constants.ts** — YouTube selectors: `YT_VIDEO_SELECTOR`, `YT_NEXT_BUTTON_SELECTOR`, `YT_PREV_BUTTON_SELECTOR`, `YT_TITLE_SELECTORS`, `YT_APP_SELECTOR`.
   - **miniPlayer.ts** — Legacy vanilla-DOM mini player implementation; **not used** (React handles UI). Can be removed or kept for reference.
   - **styles.ts** — Unused by React; used by legacy miniPlayer.

3. **Renderer (React)** (`src/renderer/`) — TypeScript
   - **Not a separate app URL.** The renderer bundle is **injected into the loaded YouTube page**.
   - Entry: `src/renderer/index.tsx` → `App.tsx`.
   - **App** waits until `window.electronAPI.isYouTubeReady()` (i.e. `ytd-app` in DOM), then renders:
     - **MiniPlayer** — Floating bar: title, **PlayTime**, audio visualizer, prev/play-pause/next.
     - **ToggleButton** — Eye icon to switch between "mini" and "full" YouTube.
     - Inline `<style>` for `body.mini-player-mode ytd-app { visibility: hidden !important; height: 0 !important; }`.
   - **Display mode:** `useDisplayMode` toggles `mini` vs `full`; persists `lastMode` in `amplionAppStore`; in mini mode calls `electronAPI.resizeWindow(500, height)`.
   - **Mini player controls** use `electronAPI.clickYouTubeButton(selector)` for prev/next and `togglePlayback()` or `electronAPI` for play/pause.
   - **Hooks:** `useVideoTitle`, `useVideoState`, `useDisplayMode` read from host page DOM / electronAPI.

4. **Build / dev**
   - **Main:** `tsconfig.main.json` → `build/main/`.
   - **Preload:** `bun build src/preload/index.ts --outfile=build/preload/preload.js` (format cjs, target node). Type-check via `tsconfig.preload.json`.
   - **Settings preload:** `bun build src/settings-preload/index.ts --outfile=build/settings-preload/settings-preload.js`. Type-check via `tsconfig.settings-preload.json`.
   - **Renderer:** Vite + React (multi-page) → `renderer_dist/`. Entries: `src/renderer/index.html` (main), `src/settings/index.html` (settings). Outputs: `src/renderer/index.html`, `src/settings/index.html`, `assets/*.js`.
   - **Dev:** `bun run dev` = `build:preload` + `build:settings-preload` then concurrently: `dev:renderer`, `dev:main`, `dev:electron`. `dev-electron` watches `build/main/main.js`, `renderer_dist/assets/*`, `build/preload/preload.js`.
   - **Packaged build:** `electron-builder`; `package.json` "build" includes `build/main/**`, `build/preload/**`, `build/settings-preload/**`, `renderer_dist/**`, `amplion.af`, `images/**`.

---

## Key Conventions and Gotchas

- **Single window:** One BrowserWindow loads YouTube; the React UI is injected into that same page. No separate "app" URL for the renderer.
- **YouTube selectors:** App depends on YouTube DOM (e.g. `ytd-app`, `video`, `.ytp-next-button`, `.ytp-prev-button`). YouTube markup changes can break things.
- **Root element:** Main process inject ensures `#root` exists before running React; React mounts there.
- **Mini vs full:** In mini mode, window is resized and `ytd-app` hidden via CSS; mini player bar stays in the same document.
- **Store:** Use `window.amplionAppStore` (not `window.store`). Keys: `windowBounds`, `lastUrl`, `customShortcut`, `lastMode` (mini/full).
- **Preload:** Lives in `src/preload/` (TS) and is built to `build/preload/preload.js`. Main window loads it from `path.join(__dirname, '..', 'preload', 'preload.js')` (relative to `build/main/`).
- **Settings:** TypeScript + React in `src/settings/`; built by Vite to `renderer_dist/src/settings/index.html`. Preload: `src/settings-preload/index.ts` → `build/settings-preload/settings-preload.js`. IPC: `get-current-shortcut`, `set-custom-shortcut`, `reset-shortcut`, `close-settings-window`.
- **Vite alias:** `@` → `./src/renderer` (see `vite.config.js`).
- **Type declarations:** `src/vite-env.d.ts` declares `Window.electronAPI`, `Window.amplionAppStore`, and `Window.settingsAPI`.

---

## File Map (High Level)

| Area           | Paths |
|----------------|-------|
| Main process   | `src/main/main.ts`, `src/main/windows.ts`, `src/main/inject.ts`, `src/main/ipc.ts`, `src/main/shortcuts.ts`, `src/main/store.ts`, `src/main/menu.ts` |
| Preload        | `src/preload/index.ts`, `src/preload/api.ts`, `src/preload/constants.ts`, `src/preload/mediaKeys.ts` |
| Renderer entry | `src/renderer/index.tsx`, `src/renderer/index.html` |
| App & UI       | `src/renderer/App.tsx`, `src/renderer/components/MiniPlayer.tsx`, `MiniPlayerControls.tsx`, `ToggleButton.tsx`, `AudioVisualizer.tsx`, `PlayTime.tsx`, `MiniPlayerButton.tsx`, `src/renderer/styles/MiniPlayer.css` |
| Hooks          | `src/renderer/hooks/useDisplayMode.ts`, `useVideoState.ts`, `useVideoTitle.ts` |
| Utils          | `src/renderer/utils/getAudioContext.ts` |
| Settings       | `src/settings-preload/index.ts` → `build/settings-preload/settings-preload.js`; `src/settings/index.html`, `main.tsx`, `SettingsApp.tsx`, `styles/Settings.css`, `utils/eventToAccelerator.ts` |
| Dev script     | `scripts/dev-electron.mjs` |
| Config         | `vite.config.js`, `tsconfig.json`, `tsconfig.main.json`, `tsconfig.preload.json`, `tsconfig.settings-preload.json`, `package.json` |

---

## Summary for Other Agents

- **UI edits:** Change React components in `src/renderer/` and styles in `src/renderer/styles/`; keep `body.mini-player-mode` and `useDisplayMode` resize logic in sync.
- **Main process:** Edit `src/main/*.ts`; keep preload API in sync (`src/preload/api.ts`) so `electronAPI` and `amplionAppStore` match.
- **IPC:** Add handler in `src/main/ipc.ts`, expose in `src/preload/api.ts` (main) or `src/settings-preload/index.ts` (settings), use in renderer or preload handlers.
- **Settings edits:** Change React components in `src/settings/`, styles in `src/settings/styles/`; keep `window.settingsAPI` in sync with `src/main/ipc.ts` and `src/settings-preload/index.ts`.
- **YouTube breakage:** Update selectors in `src/preload/constants.ts` and `api.ts`; also check injected CSS in `src/main/inject.ts`.
- **Running:** `bun run dev` for development; `bun run build` for packaged app; output to `dist/`.
