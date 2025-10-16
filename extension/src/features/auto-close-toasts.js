/**
 * Auto Close Toasts - Automatically close notification toasts after timeout
 */

import features from '../feature-manager.js';
import { observe } from '../helpers/selector-observer.js';
import { log } from './logger.js';

const selector = '.chakra-toast button[aria-label="Close"]';

function init(signal) {
  const settings = JSON.parse(localStorage.getItem('iref_settings') || '{}');
  const timeout = settings['toast-timeout-s'] || 5;

  observe(selector, (toastCloseBtn) => {
    log(`✖️ Closing toast after ${timeout} seconds`);

    // Set timeout to click close button
    const timeoutId = setTimeout(() => {
      // Find React props and trigger onClick
      const reactHandler = Object.keys(toastCloseBtn).find((key) =>
        key.startsWith('__reactProps')
      );

      if (reactHandler && toastCloseBtn[reactHandler]?.onClick) {
        toastCloseBtn[reactHandler].onClick();
      }
    }, timeout * 1000);

    // Cleanup timeout if feature is aborted
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  }, { signal });
}

void features.add('auto-close-toasts', {
  init
});
