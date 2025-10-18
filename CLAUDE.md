# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iRefined is an unofficial extension for the iRacing UI that adds quality of life features. The project consists of two main components:

1. **Extension** (JavaScript/Vite): A web extension that injects into the iRacing UI (built with React)
2. **Launcher** (Rust): A Windows system tray application that manages the extension injection

### Architecture

The extension is injected into the iRacing UI through a Chrome DevTools Protocol (CDP) WebSocket connection. The launcher monitors for the iRacing UI, then injects `bootstrap.js` which loads the extension from GitHub Pages. The extension is served remotely, allowing updates without requiring users to reinstall the launcher.

**Key architectural details:**
- The launcher (Rust) uses CDP to inject JavaScript into the iRacing Chromium-based UI
- The extension is hosted on GitHub Pages and loaded dynamically
- Features use a DOM observer pattern to watch for specific UI elements
- React internal APIs are accessed via the `react-resolver.js` helper to interact with iRacing's React components
- WebSocket connections to iRacing's backend enable session registration and real-time data

## Development Commands

### Extension (JavaScript)
```bash
cd extension
npm install                 # Install dependencies
npm run build              # Build for production (outputs to dist/)
npm run dev                # Development mode with hot reload
npm run serve              # Serve built extension locally with CORS
```

### Launcher (Rust)
```bash
cd launcher-rs
cargo build --release      # Build executable
cargo test                 # Run tests
cargo run --release        # Run launcher
```

## Project Structure

### Extension (`/extension/src/`)
- `main.js` - Entry point that imports all features
- `feature-manager.js` - Core system for registering and enabling/disabling features
- `helpers/`
  - `dom-observer.js` - Polls DOM every 300ms for elements, manages feature lifecycle
  - `websockets.js` - Socket.io client for iRacing's backend API
  - `react-resolver.js` - Utilities to access React internals in iRacing UI
  - `feature-helpers.js` - Shared utilities for features
- `features/` - Individual feature implementations (22 total)

### Launcher (`/launcher-rs/`)
- `src/main.rs` - Entry point and main event loop
- `src/config.rs` - INI file configuration management
- `src/tray.rs` - Windows system tray icon and menu
- `src/startup.rs` - Windows startup shortcut management
- `src/cdp.rs` - Chrome DevTools Protocol client
- `src/monitor.rs` - WebSocket monitoring and injection loop
- `src/iracing.rs` - iRacing installation validation
- `src/local_json.rs` - local.json installer with UAC elevation
- `src/update.rs` - Velopack update integration
- `resources/` - Embedded files (bootstrap.js, icon.ico, local.json)

Note: Python launcher in `/launcher/` is deprecated and will be removed in a future release.

## Feature Development Pattern

Each feature follows this pattern:

```javascript
import features from "../feature-manager.js";

const selector = '.some-iracing-ui-element';

features.add(
  'feature-id',           // Unique ID (stored in localStorage)
  true,                   // Whether to use DOM observer
  selector,               // CSS selector to watch for
  'feature-body-class',   // Class added to body when active
  callback                // Function called when element appears/disappears
);
```

Features are enabled/disabled via `localStorage.getItem('iref_settings')`. The settings panel (`settings-panel.jsx`) and status bar (`status-bar.jsx`) are always enabled.

## React Component Interaction

To interact with iRacing's React components:

```javascript
import { findProps, findState } from "../helpers/react-resolver.js";

// Get React props/state from a DOM element
const props = findProps(element);
const state = findState(element);
```

This works by traversing the `__reactFiber$` internal property to find the React component instance.

## WebSocket API

The extension connects to iRacing's Socket.io backend:

```javascript
import ws from "../helpers/websockets.js";

ws.register(session_name, car_id, car_class_id, session_id, subsession_id);
ws.withdraw();
ws.send(event, data);
```

Session data is received via `data_services_push` events and stored in `window.irefIndex`.

## Deployment

### Extension Deployment
- Push to `main` branch triggers `.github/workflows/extension.yml`
- Vite builds the extension to `dist/`
- Deployed to GitHub Pages at `https://jason-murray.github.io/irefined/`
- Users automatically get updates when they restart the iRacing UI
- Commit messages starting with `-` trigger Discord notifications

### Launcher Deployment
- Create a git tag (e.g., `1.5.4`) to trigger `.github/workflows/launcher-rs.yml`
- Builds Windows executable with Rust/Cargo
- Packages with Velopack for auto-updates
- Publishes release to GitHub
- Users get updates via the tray menu "Check for Updates"

## iRacing UI Specifics

- The iRacing UI is a Chromium-based browser loading from `members.iracing.com`
- The UI is frequently updated by iRacing, which can break features silently
- The extension must be robust to DOM structure changes
- Always check for element existence before accessing properties
- Use the `log()` function from `logger.js` for debugging (appears in settings panel)

## Configuration

Launcher config is stored in `~/Documents/iRefined/irefined.ini`:
- `IRACING_PATH`: Path to iRacing installation (default: `C:\Program Files (x86)\iRacing\`)
- `PORT`: Chrome DevTools Protocol port (default: 9222)

Extension settings are stored in `localStorage` with key `iref_settings`.
