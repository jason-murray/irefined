# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iRefined is an unofficial extension for the iRacing UI that adds quality of life features. The project consists of two main components:

1. **Extension** (Vue 3 + Vite): A web extension that injects into the iRacing UI (built with React)
2. **Launcher** (Python): A Windows system tray application that manages the extension injection

### Architecture

The extension is injected into the iRacing UI through a Chrome DevTools Protocol (CDP) WebSocket connection. The launcher monitors for the iRacing UI, then injects `bootstrap.js` which loads the extension from GitHub Pages. The extension is served remotely, allowing updates without requiring users to reinstall the launcher.

**Key architectural details:**
- The launcher (Python) uses CDP to inject JavaScript into the iRacing Chromium-based UI
- The extension is hosted on GitHub Pages and loaded dynamically
- **Vue 3 app** mounted in `#irefined-app` div (separate from iRacing's React app)
- Features use **CSS animation observer** for instant element detection (no polling)
- **AbortSignal** pattern for proper cleanup and memory management
- React internal APIs accessed via `react-resolver.js` helper to interact with iRacing's React components
- WebSocket connections to iRacing's backend enable session registration and real-time data
- **Pinia stores** manage state (queue, settings, logs)
- **Theme system** adapts to iRacing's light/dark mode

## Development Commands

### Extension (JavaScript/Vue)
```bash
cd extension
npm install                 # Install dependencies (includes Vue, Pinia, @vueuse/core)
npm run build              # Build for production (outputs to dist/)
npm run dev                # Development mode with hot reload
npm run serve              # Serve built extension locally with CORS
```

### Launcher (Python)
```bash
cd launcher
pipenv install             # Install dependencies
pipenv shell               # Activate virtual environment
pipenv run cxfreeze build --target-dir=dist  # Build executable
```

## Project Structure

### Extension (`/extension/src/`)

**Main Entry Points:**
- `main.js` - Loads features, exposes feature manager globally
- `vue/main.js` - Vue 3 app entry point, mounts to `#irefined-app`

**Vue Application (`/vue/`):**
- `App.vue` - Root component
- `components/`
  - `StatusBar.vue` - Bottom bar with logo, queue items, console, and settings buttons
  - `QueueItem.vue` - Individual queue item display
  - `LogPanel.vue` - Console log modal
  - `LogButton.vue` - Console button with message count badge
  - `SettingsPanel.vue` - Settings modal (all 10 settings)
  - `SettingsButton.vue` - Animated gradient settings button
- `composables/`
  - `useWebSocket.js` - WebSocket integration with Pinia
  - `useSettings.js` - Settings management
- `store/`
  - `index.js` - Pinia stores (queue, settings, log)
- `styles/`
  - `theme.css` - CSS variables for light/dark mode

**Features v2 (`/features-v2/`):** Refactored with modern patterns
- `no-sidebars.js` - CSS-only feature
- `collapse-menu.js` - CSS-only feature
- `no-toasts.js` - CSS-only feature
- `auto-close-toasts.js` - Auto-close notifications
- `better-join-button.js` - Session type display on join button
- `auto-join.js` - Auto-join scored sessions
- `auto-forfeit.js` - Auto-forfeit after timeout
- `auto-register.js` - Queue system for future races
- `share-test-session.jsx` - Test drive session sharing
- `share-hosted-session.jsx` - Hosted session sharing
- `logger.js` - Log message handler (pushes to Pinia store)

**Helpers:**
- `helpers/`
  - `selector-observer.js` - **CSS animation-based element observer** (replaces polling)
  - `websockets.js` - Socket.io client for iRacing's backend API
  - `react-resolver.js` - Utilities to access React internals in iRacing UI
  - `queue-bridge.js` - Bridges `window.watchQueue` with Pinia store for backwards compatibility
- `iracing-helpers/`
  - `page-detect.js` - URL/page detection helpers

**Feature Managers:**
- `feature-manager.js` - Legacy callback-based system (deprecated)
- `feature-manager-v2.js` - **New Refined GitHub-inspired system** with AbortSignal support

### Launcher (`/launcher/`)
- `main.py` - System tray app that monitors for iRacing UI and injects extension
- `bootstrap.js` - Initial injection script that:
  - Creates `#irefined-app` div after iRacing's `#app` div
  - Loads `extension.css`, `main.js`, and `vue.js` from GitHub Pages
- `install_config.bat` - Copies `local.json` to iRacing config folder (with UAC elevation)
- `local.json` - Contains `{"scorpioDebugPort": 9222}` for CDP connection

## Feature Development Pattern (v2)

**Modern pattern** (inspired by Refined GitHub):

```javascript
import features from '../feature-manager-v2.js';
import { observe } from '../helpers/selector-observer.js';
import { isRacingPage } from '../iracing-helpers/page-detect.js';
import './feature-name.css';

function init(signal) {
  // CSS animation observer for instant detection
  observe('.some-iracing-ui-element', (element) => {
    // Setup with automatic cleanup via signal
    element.addEventListener('click', handler, { signal });
  }, { signal });
}

void features.add(import.meta.url, {
  include: [isRacingPage],  // At least one must be true
  exclude: [],              // None must be true
  init                      // Receives AbortSignal for cleanup
});
```

**CSS-only features:**

```javascript
import features from '../feature-manager-v2.js';
import './feature-name.css';

void features.addCssFeature(import.meta.url);
```

Features are enabled/disabled via `localStorage.getItem('iref_settings')`. The status bar (Vue) is always visible.

## Vue Components Architecture

**Status Bar (Always Visible):**
- Purple logo on left
- Queue items in middle (when present)
- Console button with badge (message count)
- Settings button (animated gradient) on right

**Modals (Teleported to body):**
- LogPanel - Console output with scrolling, timestamps, clear button
- SettingsPanel - All feature toggles and configuration

**State Management (Pinia):**
```javascript
import { useQueueStore, useSettingsStore, useLogStore } from './store/index.js';

const queueStore = useQueueStore();
queueStore.addToQueue(item);
queueStore.sortedQueue; // Getter

const settingsStore = useSettingsStore();
settingsStore.updateSetting('feature-id', true);

const logStore = useLogStore();
logStore.addMessage('Log text'); // Auto-timestamped
```

**Exposed Globals:**
- `window.irefFeatures` - Feature manager v2
- `window.irefQueueStore` - Queue Pinia store
- `window.irefLogStore` - Log Pinia store
- `window.watchQueue` - Proxied to Pinia store for backwards compatibility

## Theme System

iRefined adapts to iRacing's theme via CSS variables:

```css
/* Responds to html[style*="color-scheme: light"] */
--iref-bg-primary       /* Background (black/white) */
--iref-bg-secondary     /* Secondary background */
--iref-text-primary     /* Text color (white/black) */
--iref-border-color     /* Border color */
--iref-bar-highlight    /* Purple (#6120ff) - stays consistent */
```

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

ws.register(session_name, car_id, car_class_id, session_id);
ws.withdraw();
ws.send(event, data);
```

Session data is received via `data_services_push` events. Queue store processes WebSocket data automatically.

## Logging

All features use the centralized logger:

```javascript
import { log } from '../features-v2/logger.js';

log('✅ Feature initialized');  // Appears in console panel with timestamp
```

Logs are:
- Stored in Pinia log store (last 100 messages)
- Displayed in console panel (click console button in status bar)
- Also sent to browser console for debugging

## Deployment

### Extension Deployment
- Push to `main` branch triggers `.github/workflows/extension.yml`
- Vite builds to `dist/`:
  - `main.js` (14KB) - Features
  - `vue.js` (84KB) - Vue app
  - `websockets.js` (44KB) - WebSocket client (separate chunk)
  - `extension.css` (9.5KB) - Combined styles
  - `logo.png` (4.5KB)
- Deployed to GitHub Pages at `https://jason-murray.github.io/irefined/`
- Users automatically get updates when they restart the iRacing UI
- Commit messages starting with `-` trigger Discord notifications

### Launcher Deployment
- Create a git tag (e.g., `1.5.4`) to trigger `.github/workflows/launcher.yml`
- Builds Windows executable with cx_Freeze
- Packages with Velopack for auto-updates
- Publishes release to GitHub
- Users get updates via the tray menu "Check for Updates"

## iRacing UI Specifics

- The iRacing UI is a Chromium-based browser loading from `members.iracing.com`
- iRacing's React root is `#app` (changed from `#root`)
- The UI is frequently updated by iRacing, which can break features silently
- The extension must be robust to DOM structure changes
- Always check for element existence before accessing properties
- **Do not manipulate iRacing's React DOM directly** - use absolute positioning over elements instead
- iRacing sets `color-scheme: light` or `dark` on `<html>` element

## Configuration

Launcher config is stored in `~/Documents/iRefined/irefined.ini`:
- `IRACING_PATH`: Path to iRacing installation (default: `C:\Program Files (x86)\iRacing\`)
- `PORT`: Chrome DevTools Protocol port (default: 9222)

Extension settings are stored in `localStorage` with key `iref_settings`.

## Build System

**Vite Configuration:**
- Dual entry points: `main.js` (features) and `vue/main.js` (Vue app)
- Vue plugin: `@vitejs/plugin-vue`
- Custom plugin combines CSS files into `extension.css`
- Outputs ES modules with sourcemaps

**Dependencies:**
- Vue 3.5+ - Reactive UI framework
- Pinia 2.3+ - State management
- @vueuse/core - Vue composables library
- dom-chef - JSX for real DOM elements (legacy features)
- select-dom - DOM selectors
- socket.io-client - WebSocket connection

## Key Architectural Decisions

1. **Vue app mounted separately** - `#irefined-app` created after iRacing's `#app`, no DOM conflicts
2. **CSS animation observer** - Instant element detection, zero polling overhead, ~10x faster than 300ms interval
3. **AbortSignal everywhere** - Proper cleanup prevents memory leaks on navigation
4. **Pinia for state** - Better than `window` globals, reactive, debuggable
5. **Absolute positioning** - Vue components positioned over iRacing UI, non-invasive
6. **Theme CSS variables** - Automatically adapts to iRacing's light/dark mode
7. **Queue bridge** - `window.watchQueue` proxied to Pinia for backwards compatibility
8. **Dual bundle** - Features and Vue app separate, can be loaded independently
9. **Status bar integration** - All controls in bottom bar, no floating elements over iRacing UI
10. **Console panel** - Logs accessible via button, no settings toggle needed
