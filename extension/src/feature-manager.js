/**
 * Feature Manager
 * Refined GitHub-inspired feature registration system with AbortSignal support
 */

import { log } from "./features/logger.js";

const registeredFeatures = new Map();
const activeControllers = new Map();

/**
 * Check if a feature should be enabled based on settings
 * @param {string} id - Feature ID
 * @returns {boolean}
 */
function isFeatureEnabled(id) {
  const options = JSON.parse(localStorage.getItem("iref_settings") || "{}");

  // Always-on features
  if (id === "settings-panel" || id === "status-bar") {
    return true;
  }

  return options[id] === true;
}

/**
 * Check if feature conditions are met
 * @param {Function[]} include - Array of condition functions (at least one must be true)
 * @param {Function[]} exclude - Array of exclusion functions (none must be true)
 * @returns {boolean}
 */
function checkConditions(include = [], exclude = []) {
  // If include is empty, default to true
  const includePass = include.length === 0 || include.some(fn => fn());

  // All exclude conditions must be false
  const excludePass = exclude.length === 0 || !exclude.some(fn => fn());

  return includePass && excludePass;
}

/**
 * Register and initialize a feature
 * @param {string} idOrUrl - Feature ID or module URL (use feature ID string or import.meta.url)
 * @param {Object} config - Feature configuration
 * @param {string} [config.id] - Optional explicit feature ID (overrides extraction from URL)
 * @param {Function|Function[]} config.init - Initialization function(s) that receive AbortSignal
 * @param {Function[]} [config.include] - Condition functions (at least one must be true)
 * @param {Function[]} [config.exclude] - Exclusion functions (none must be true)
 * @param {boolean} [config.awaitDomReady] - Wait for DOM ready before initializing
 * @param {Object} [config.shortcuts] - Keyboard shortcuts for this feature
 * @returns {Promise<void>}
 */
export async function add(idOrUrl, config) {
  // Extract feature ID - use explicit ID from config if provided, otherwise extract from URL
  const id = config.id || idOrUrl.split('/').pop().split('?')[0].replace(/\.(js|jsx|ts|tsx)$/, '');

  // Debug logging
  console.log('[Feature Manager] Registering:', { idOrUrl, id, config });

  // Store feature configuration with original URL for reloading
  registeredFeatures.set(id, { ...config, __url: idOrUrl });

  // Check if feature is enabled
  if (!isFeatureEnabled(id)) {
    log(`❌ Feature disabled: ${id}`);
    return;
  }

  // Check conditions
  if (!checkConditions(config.include, config.exclude)) {
    log(`⏭️ Feature conditions not met: ${id}`);
    return;
  }

  log(`✅ Initializing feature: ${id}`);

  // Create AbortController for this feature
  const controller = new AbortController();
  activeControllers.set(id, controller);

  // Get init function(s)
  const initFns = Array.isArray(config.init) ? config.init : [config.init];

  // Wait for DOM ready if requested
  if (config.awaitDomReady) {
    await new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else {
        resolve();
      }
    });
  }

  // Initialize feature(s)
  try {
    for (const init of initFns) {
      const result = await init(controller.signal);

      // If init returns false, stop initialization
      if (result === false) {
        log(`⚠️ Feature ${id} initialization returned false`);
        unload(id);
        return;
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      log(`🛑 Feature ${id} was aborted`);
    } else {
      console.error(`[iRefined] Error initializing feature ${id}:`, error);
    }
  }
}

/**
 * Register a CSS-only feature (no JavaScript initialization)
 * @param {string} id - Feature ID
 * @returns {void}
 */
export function addCssFeature(id) {
  // Store in registeredFeatures so it can be tracked
  registeredFeatures.set(id, { __cssOnly: true });

  if (isFeatureEnabled(id)) {
    log(`✅ CSS feature enabled: ${id}`);
    document.body.classList.add(`iref-${id}`);
  } else {
    // Ensure class is removed if feature is disabled
    document.body.classList.remove(`iref-${id}`);
  }
}

/**
 * Unload a specific feature
 * @param {string} id - Feature ID
 * @returns {void}
 */
export function unload(id) {
  const controller = activeControllers.get(id);

  if (controller) {
    controller.abort();
    activeControllers.delete(id);
    log(`🗑️ Unloaded feature: ${id}`);
  }

  // Remove body class
  document.body.classList.remove(`iref-${id}`);
}

/**
 * Unload all active features
 * @returns {void}
 */
export function unloadAll() {
  for (const id of activeControllers.keys()) {
    unload(id);
  }
  log('🗑️ Unloaded all features');
}

/**
 * Reload all features (useful after settings change)
 * @returns {Promise<void>}
 */
export async function reloadAll() {
  log('🔄 Reloading all features...');

  // Store feature configs before unloading
  const features = Array.from(registeredFeatures.entries());

  // Debug: log what features are registered
  console.log('[Feature Manager] Registered features before reload:', features.map(([id, config]) => ({ id, hasUrl: !!config.__url, url: config.__url })));

  // Unload all
  unloadAll();

  // Re-initialize all features using stored URLs
  for (const [id, config] of features) {
    // Handle CSS-only features
    if (config.__cssOnly) {
      console.log(`[Feature Manager] Reloading CSS feature: ${id}`);
      addCssFeature(id);
      continue;
    }

    const url = config.__url; // Use stored URL
    console.log(`[Feature Manager] Reloading feature: ${id}, url: ${url}`);
    if (url) {
      // Create a clean config without the __url property
      const { __url, ...cleanConfig } = config;
      await add(url, cleanConfig);
    } else {
      console.warn(`[Feature Manager] Feature ${id} has no __url, skipping reload`);
    }
  }

  log('✅ All features reloaded');
}

/**
 * Get list of registered features
 * @returns {Map}
 */
export function getFeatures() {
  return registeredFeatures;
}

/**
 * Get list of active features
 * @returns {Map}
 */
export function getActiveFeatures() {
  return activeControllers;
}

const features = {
  add,
  addCssFeature,
  unload,
  unloadAll,
  reloadAll,
  getFeatures,
  getActiveFeatures
};

export default features;
