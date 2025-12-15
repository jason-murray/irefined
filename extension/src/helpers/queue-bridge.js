/**
 * Queue Bridge
 * Bridges between old window.watchQueue and new Vue Pinia store
 * This allows features to work with both systems during migration
 */

// Expose Vue store to window for legacy features
export function initQueueBridge(queueStore) {
  // Create a proxy for window.watchQueue that syncs with Pinia store
  let internalQueue = [];

  Object.defineProperty(window, 'watchQueue', {
    get() {
      // Return items from Pinia store
      return queueStore.items;
    },
    set(value) {
      // When legacy code sets the queue, sync to Pinia store
      internalQueue = value;

      // Clear and repopulate store
      queueStore.clearQueue();
      value.forEach(item => {
        queueStore.addToQueue(item);
      });
    },
    configurable: true
  });

  // Also expose queue store globally for features
  window.irefQueueStore = queueStore;

  console.log('[iRefined] Queue bridge initialized - window.watchQueue synced with Pinia store');
}

// Helper to add item to queue from legacy code
export function addToQueue(item) {
  if (window.irefQueueStore) {
    window.irefQueueStore.addToQueue(item);
  } else if (window.watchQueue) {
    window.watchQueue.push(item);
  }
}

// Helper to remove item from queue
export function removeFromQueue(itemId) {
  if (window.irefQueueStore) {
    window.irefQueueStore.removeFromQueue(itemId);
  } else if (window.watchQueue) {
    window.watchQueue = window.watchQueue.filter(item => item.id !== itemId);
  }
}
