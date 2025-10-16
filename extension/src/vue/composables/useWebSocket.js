/**
 * WebSocket Composable
 * Connects iRacing WebSocket to Vue store
 */

import { ref, onMounted, onUnmounted } from 'vue';
import { useQueueStore } from '../store/index.js';
import ws from '../../helpers/websockets.js';

export function useWebSocket() {
  const queueStore = useQueueStore();
  const isConnected = ref(false);

  let callbackIndex = -1;

  // WebSocket message handler
  const handleMessage = (data) => {
    // Update queue store with WebSocket data
    queueStore.processWebSocketData(data);
  };

  onMounted(() => {
    // Register callback with WebSocket helper
    ws.callbacks.push(handleMessage);
    callbackIndex = ws.callbacks.length - 1;

    console.log('[iRefined] WebSocket composable connected');
    isConnected.value = true;
  });

  onUnmounted(() => {
    // Remove callback on cleanup
    if (callbackIndex >= 0) {
      ws.callbacks.splice(callbackIndex, 1);
    }
    isConnected.value = false;
    console.log('[iRefined] WebSocket composable disconnected');
  });

  return {
    isConnected,
    ws
  };
}
