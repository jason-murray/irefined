/**
 * Logger - Push log messages to Vue store
 */

export function log(message) {
  // Push to Vue log store if available
  if (window.irefLogStore) {
    window.irefLogStore.addMessage(message);
  }

  // Also log to console for debugging
  console.log(`[iRefined] ${message}`);
}
