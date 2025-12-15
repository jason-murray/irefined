/**
 * CSS animation-based element observer
 * Based on Refined GitHub's implementation
 * More efficient than polling or MutationObserver for large DOMs
 */

const seenMark = 'iref-seen';
const animationName = 'iref-observe-animation';

// Inject CSS animation rules
const style = document.createElement('style');
style.textContent = `
@keyframes ${animationName} {
  from { opacity: 0.99; }
  to { opacity: 1; }
}
`;
document.head.append(style);

const elementObserverRules = new Map();

/**
 * Observe elements matching a selector
 * @param {string} selector - CSS selector to watch for
 * @param {Function} callback - Called when element appears (element, signal) => void
 * @param {Object} options - Options object
 * @param {AbortSignal} options.signal - AbortSignal for cleanup
 * @returns {void}
 */
export function observe(selector, callback, options = {}) {
  const { signal } = options;

  // Add CSS rule to trigger animation on unobserved elements
  if (!elementObserverRules.has(selector)) {
    const rule = `${selector}:not(.${seenMark}) { animation: ${animationName} 1ms; }`;
    const ruleIndex = style.sheet.insertRule(rule, style.sheet.cssRules.length);
    elementObserverRules.set(selector, ruleIndex);
  }

  // Listen for animation start events
  const handleAnimationStart = (event) => {
    if (event.animationName !== animationName) {
      return;
    }

    const element = event.target;

    // Check if element matches our selector and hasn't been seen
    if (element.matches(selector) && !element.classList.contains(seenMark)) {
      element.classList.add(seenMark);
      callback(element, signal);
    }
  };

  document.addEventListener('animationstart', handleAnimationStart, { signal });

  // Also check for existing elements immediately
  for (const element of document.querySelectorAll(selector)) {
    if (!element.classList.contains(seenMark)) {
      element.classList.add(seenMark);
      callback(element, signal);
    }
  }

  // Cleanup on abort
  if (signal) {
    signal.addEventListener('abort', () => {
      document.removeEventListener('animationstart', handleAnimationStart);
    });
  }
}

/**
 * Wait for an element to appear
 * @param {string} selector - CSS selector to wait for
 * @param {Object} options - Options object
 * @param {AbortSignal} options.signal - AbortSignal for cleanup
 * @param {number} options.timeout - Timeout in milliseconds
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, options = {}) {
  const { signal, timeout = 10000 } = options;

  return new Promise((resolve, reject) => {
    // Check if element already exists
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout waiting for ${selector}`));
    }, timeout);

    // Create AbortController for internal cleanup
    const controller = new AbortController();
    const internalSignal = controller.signal;

    // Listen for abort from parent signal
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
        reject(new Error('Aborted'));
      });
    }

    // Observe for the element
    observe(
      selector,
      (element) => {
        clearTimeout(timeoutId);
        controller.abort();
        resolve(element);
      },
      { signal: internalSignal }
    );
  });
}

export default observe;
