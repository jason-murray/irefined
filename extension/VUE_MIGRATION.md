# Vue Migration - Stage 2 Complete ✅

## What's Been Migrated

### Vue Components (New)
- **StatusBar.vue** - Bottom queue bar with race countdown
- **QueueItem.vue** - Individual queue items with status indicators
- **SettingsPanel.vue** - Full settings modal with all 11 settings
- **SettingsButton.vue** - Animated toolbar button to open settings

### Infrastructure
- **CSS Animation Observer** (`helpers/selector-observer.js`) - Replaces 300ms polling
- **Feature Manager v2** (`feature-manager-v2.js`) - AbortSignal support, Refined GitHub patterns
- **Page Detection** (`iracing-helpers/page-detect.js`) - Declarative page conditions
- **Queue Bridge** (`helpers/queue-bridge.js`) - Syncs `window.watchQueue` with Pinia store
- **Pinia Stores** (`vue/store/index.js`) - Queue and Settings state management

### Disabled Features (Now Vue)
- ~~`features/status-bar.jsx`~~ → `vue/components/StatusBar.vue`
- ~~`features/settings-panel.jsx`~~ → `vue/components/SettingsPanel.vue`

## Architecture

```
iRacing UI (React)
    ↓
#root (iRacing's container)
    ↓
#irefined-app (Vue mount point - created by bootstrap.js)
    ↓
Vue App
    ├── StatusBar (bottom bar, absolute position)
    ├── SettingsButton (toolbar, fixed position)
    └── SettingsPanel (modal, teleport to body)
```

### Key Design Decisions

1. **No DOM Conflicts** - Vue app mounts in separate `#irefined-app` div after iRacing's `#root`
2. **Absolute Positioning** - Vue components positioned over iRacing UI, not inserted into it
3. **Backwards Compatible** - Queue bridge syncs `window.watchQueue` with Pinia store
4. **Dual Entry Points** - `main.js` (features) + `vue.js` (Vue app) loaded separately

## Build Output

```
dist/
├── main.js          13KB  - Features (non-Vue)
├── vue.js           84KB  - Vue app (StatusBar, Settings, Stores)
├── websockets.js    45KB  - WebSocket client (separate chunk)
├── extension.css    6KB   - Combined CSS (main + vue + websockets)
└── logo.png         4.5KB
```

## Files Loaded by Bootstrap

```javascript
// bootstrap.js injects:
1. extension.css        (combined styles)
2. main.js             (features)
3. vue.js              (Vue app)
```

## State Management

### Pinia Stores

**Queue Store:**
- `items` - Array of queued race sessions
- `sortedQueue` - Getter for time-sorted queue
- `addToQueue(item)` - Add session to queue
- `removeFromQueue(id)` - Remove session
- `updateStatus(id, status)` - Update session status
- `processWebSocketData(data)` - Handle WebSocket events

**Settings Store:**
- `settings` - User settings object (synced with localStorage)
- `isOpen` - Settings panel visibility
- `updateSetting(key, value)` - Update single setting
- `updateSettings(updates)` - Batch update
- `toggleSettings()` - Open/close panel

### Queue Bridge

Window.watchQueue is now a **getter/setter** that syncs with Pinia:

```javascript
// Legacy code still works:
window.watchQueue.push(item);  // ✅ Syncs to Pinia store

// New Vue code:
queueStore.addToQueue(item);   // ✅ Updates window.watchQueue
```

## Settings List (All 11 Migrated)

1. Test Drive session sharing buttons
2. Hosted/League session sharing buttons
3. Queue system for future sessions
4. Join button displays session type
5. Auto join sessions (with type selector)
6. Auto forfeit after X minutes
7. No notifications
8. Auto close notifications after X seconds
9. Hide sidebars
10. Collapse menu
11. Show log messages

## Performance Improvements

### Before (Polling)
- 300ms setInterval checking for elements
- Continuous CPU usage
- Delayed element detection

### After (CSS Animation Observer)
- Instant element detection via `animationstart` events
- Zero polling overhead
- Better battery life

## WebSocket Integration

```javascript
// vue/composables/useWebSocket.js
export function useWebSocket() {
  const queueStore = useQueueStore();

  // Register callback with existing WebSocket helper
  ws.callbacks.push((data) => {
    queueStore.processWebSocketData(data);
  });

  return { ws, isConnected };
}
```

WebSocket events automatically update queue status:
- `queued` → searching for session
- `found` → session found, waiting to register
- `registering` → actively registering

## Next Steps (Stage 3)

### Features to Migrate

Still using old system:
- ✅ logger.js
- ✅ no-sidebars.js
- ✅ no-toasts.js
- ✅ collapse-menu.js
- ✅ auto-close-toasts.js
- ✅ share-test-session.jsx
- ✅ share-hosted-session.jsx
- ✅ better-join-button.js
- ✅ auto-join.js
- ✅ auto-forfeit.js
- ✅ auto-register.js

### Migration Strategy

1. **CSS-only features** (no-sidebars, collapse-menu, no-toasts)
   - Convert to `featuresV2.addCssFeature()` pattern
   - Remove old feature files

2. **Interactive features** (auto-join, auto-forfeit)
   - Refactor to use `observe()` with AbortSignal
   - Use new `features.add()` API

3. **UI features** (share-test-session, share-hosted-session)
   - Convert buttons to Vue components
   - Use absolute positioning strategy

4. **Better-join-button**
   - Hybrid: Vue overlay + CSS styling
   - Detect button position, render Vue component over it

## Testing Checklist

- [ ] Settings button appears in toolbar
- [ ] Clicking settings button opens modal
- [ ] All 11 settings load correctly
- [ ] Saving settings updates localStorage
- [ ] Queue bar appears when items are queued
- [ ] Queue items show correct countdown
- [ ] Queue items update status (queued → found → registering)
- [ ] Removing queue item works
- [ ] WebSocket events update queue
- [ ] Old features still work (no-sidebars, logger, etc.)
- [ ] No console errors
- [ ] No React errors in iRacing UI

## Deployment

1. Build: `npm run build`
2. Output: `dist/` folder
3. Deploy to GitHub Pages
4. Bootstrap loads: `extension.css`, `main.js`, `vue.js`
5. Users get updates on next iRacing UI restart

## Known Issues / TODOs

- [ ] Logger panel needs Vue migration (currently JSX)
- [ ] Plausible analytics script in old settings-panel.jsx (may need to add back)
- [ ] Feature manager v2 `reloadAll()` needs testing
- [ ] CSS classes for body (iref-status-bar, etc.) may need adjustments

## Code Organization

### Before
```
src/
├── features/           (22 features, mixed patterns)
├── helpers/            (dom-observer.js with polling)
└── feature-manager.js  (callback-based)
```

### After
```
src/
├── features/           (legacy features, being migrated)
├── vue/                (NEW)
│   ├── components/     (Vue SFCs)
│   ├── composables/    (reusable logic)
│   └── store/          (Pinia stores)
├── helpers/            (NEW)
│   ├── selector-observer.js  (CSS animation)
│   └── queue-bridge.js       (backwards compat)
├── iracing-helpers/    (NEW)
│   └── page-detect.js
├── feature-manager.js      (legacy)
└── feature-manager-v2.js   (NEW)
```

## References

- [Refined GitHub](https://github.com/refined-github/refined-github) - Architecture inspiration
- [Vue 3 Docs](https://vuejs.org) - Composition API, Teleport
- [Pinia Docs](https://pinia.vuejs.org) - State management
- [CSS Animation Trick](https://davidwalsh.name/detect-node-insertion) - Element observer pattern
