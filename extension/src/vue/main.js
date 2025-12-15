/**
 * Vue App Entry Point
 * Mounts iRefined Vue app alongside iRacing's React app
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { useQueueStore, useLogStore } from './store/index.js';
import { initQueueBridge } from '../helpers/queue-bridge.js';

// Wait for iRacing app to be ready and mount point to exist
function initVueApp() {
  const mountPoint = document.querySelector('#irefined-app');

  if (!mountPoint) {
    console.error('[iRefined Vue] Mount point #irefined-app not found');
    return;
  }

  const pinia = createPinia();
  const app = createApp(App);

  app.use(pinia);
  app.mount('#irefined-app');

  // Initialize queue bridge for legacy features
  const queueStore = useQueueStore();
  initQueueBridge(queueStore);

  // Expose log store for logger.js
  const logStore = useLogStore();
  window.irefLogStore = logStore;

  // Expose feature manager for settings panel
  if (window.irefFeatures) {
    console.log('[iRefined Vue] Feature manager found');
  }

  console.log('[iRefined Vue] App initialized and mounted');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVueApp);
} else {
  initVueApp();
}
