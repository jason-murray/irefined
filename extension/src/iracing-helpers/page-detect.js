/**
 * Page detection helpers for iRacing UI
 * Similar to github-url-detection from Refined GitHub
 */

/**
 * Check if current page is the racing/series browsing page
 * @returns {boolean}
 */
export const isRacingPage = () => {
  return window.location.pathname.includes('/racing') ||
         window.location.href.includes('go-racing');
};

/**
 * Check if current page is a specific series page
 * @returns {boolean}
 */
export const isSeriesPage = () => {
  return window.location.pathname.includes('/series/');
};

/**
 * Check if user is currently registered for a session
 * @returns {boolean}
 */
export const isRegisteredSession = () => {
  return !!document.querySelector('[class*="registered"]') ||
         !!document.querySelector('[data-registered="true"]');
};

/**
 * Check if on the home/dashboard page
 * @returns {boolean}
 */
export const isHomePage = () => {
  return window.location.pathname === '/' ||
         window.location.pathname === '/home';
};

/**
 * Check if in a test/practice session view
 * @returns {boolean}
 */
export const isTestDrivePage = () => {
  return window.location.pathname.includes('/test-drive') ||
         window.location.pathname.includes('/practice');
};

/**
 * Check if in hosted session view
 * @returns {boolean}
 */
export const isHostedPage = () => {
  return window.location.pathname.includes('/hosted') ||
         window.location.pathname.includes('/league');
};

/**
 * Check if current page has the main content area loaded
 * @returns {boolean}
 */
export const isContentLoaded = () => {
  return !!document.querySelector('#app') &&
         !!document.querySelector('[class*="content"]');
};

/**
 * Helper to check multiple conditions (at least one must be true)
 * @param {Function[]} conditions - Array of condition functions
 * @returns {boolean}
 */
export const any = (...conditions) => {
  return conditions.some(condition => condition());
};

/**
 * Helper to check multiple conditions (all must be true)
 * @param {Function[]} conditions - Array of condition functions
 * @returns {boolean}
 */
export const all = (...conditions) => {
  return conditions.every(condition => condition());
};
