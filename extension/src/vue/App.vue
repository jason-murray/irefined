<template>
  <div id="irefined-root">
    <!-- Status Bar (bottom bar with logo, queue, log, and settings button) -->
    <StatusBar />

    <!-- Log Panel (modal) -->
    <LogPanel />

    <!-- Settings Panel (modal) -->
    <SettingsPanel />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import StatusBar from './components/StatusBar.vue';
import LogPanel from './components/LogPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import { useQueueStore } from './store/index.js';
import { useWebSocket } from './composables/useWebSocket.js';

const queueStore = useQueueStore();

// Initialize WebSocket connection
const { isConnected } = useWebSocket();

onMounted(() => {
  console.log('[iRefined Vue] App mounted');
});
</script>

<style>
/* Import theme variables */
@import './styles/theme.css';

#irefined-root {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 9000;
    pointer-events: none;
}

#irefined-root > * {
  /* Allow interactions with child components */
  pointer-events: auto;
}
</style>
