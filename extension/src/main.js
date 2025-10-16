// Setup
import "./helpers/websockets.js";

// Expose feature manager globally for Vue components
import features from "./feature-manager.js";
window.irefFeatures = features;

// Features
// Note: status-bar and settings-panel are now Vue components in vue/
import "./features/logger.js";
import "./features/no-sidebars.js";
import "./features/no-toasts.js";
import "./features/collapse-menu.js";
import "./features/auto-close-toasts.js";
import "./features/share-test-session.jsx";
import "./features/share-hosted-session.jsx";
import "./features/better-join-button.js";
import "./features/auto-join.js";
import "./features/auto-forfeit.js";
import "./features/auto-register.js";
