/**
 * Pinia Store - Central state management for iRefined Vue app
 */

import { defineStore } from 'pinia';

/**
 * Queue Store - Manages race registration queue
 */
export const useQueueStore = defineStore('queue', {
  state: () => ({
    items: [],
    activeSession: null
  }),

  getters: {
    /**
     * Get queue sorted by start time
     */
    sortedQueue: (state) => {
      return [...state.items].sort((a, b) => {
        return new Date(a.start_time) - new Date(b.start_time);
      });
    },

    /**
     * Get count of queued items
     */
    queueCount: (state) => state.items.length,

    /**
     * Find queue item by session ID
     */
    findBySessionId: (state) => (sessionId) => {
      return state.items.find(item => item.session_id === sessionId);
    }
  },

  actions: {
    /**
     * Add item to queue
     */
    addToQueue(item) {
      // Check if already in queue
      const exists = this.items.some(q =>
        q.season_id === item.season_id &&
        q.start_time === item.start_time
      );

      if (!exists) {
        this.items.push({
          ...item,
          status: item.status || 'queued',
          id: `${item.season_id}-${item.start_time}`
        });
      }
    },

    /**
     * Remove item from queue
     */
    removeFromQueue(id) {
      this.items = this.items.filter(item => item.id !== id);
    },

    /**
     * Update queue item status
     */
    updateStatus(id, status) {
      const item = this.items.find(item => item.id === id);
      if (item) {
        item.status = status;
      }
    },

    /**
     * Update queue item with session data
     */
    updateItem(id, data) {
      const item = this.items.find(item => item.id === id);
      if (item) {
        Object.assign(item, data);
      }
    },

    /**
     * Clear all queue items
     */
    clearQueue() {
      this.items = [];
    },

    /**
     * Set active session
     */
    setActiveSession(session) {
      this.activeSession = session;
    },

    /**
     * Process WebSocket data
     */
    processWebSocketData(data) {
      // Check INSERT events
      try {
        if (data.data?.delta?.INSERT) {
          data.data.delta.INSERT.forEach(session => {
            this.checkSessionMatch(session);
          });
        }
      } catch (e) {
        console.error('[iRefined] Error processing INSERT:', e);
      }

      // Check REGISTRATION events
      try {
        if (data.data?.delta?.REGISTRATION) {
          data.data.delta.REGISTRATION.forEach(session => {
            this.checkSessionMatch(session);
          });
        }
      } catch (e) {
        console.error('[iRefined] Error processing REGISTRATION:', e);
      }
    },

    /**
     * Check if session matches any queue item
     */
    checkSessionMatch(session) {
      this.items.forEach(queueItem => {
        if (queueItem.status !== 'queued') {
          return;
        }

        const isoTime = new Date(queueItem.start_time).toISOString().split('.')[0] + 'Z';

        if (
          session.season_id === queueItem.season_id &&
          session.event_type === 5 &&
          session.start_time === isoTime &&
          session.session_id > 0
        ) {
          this.updateItem(queueItem.id, {
            session_id: session.session_id,
            status: 'found'
          });

          console.log(`[iRefined] Found race session for ${queueItem.season_name}`);
        }
      });
    }
  }
});

/**
 * Log Store - Manages console log messages
 */
export const useLogStore = defineStore('log', {
  state: () => ({
    messages: [],
    isOpen: false,
    maxMessages: 100 // Keep last 100 messages
  }),

  actions: {
    /**
     * Add a log message
     */
    addMessage(text) {
      const timestamp = new Date().toTimeString().split(' ')[0];

      this.messages.push({
        timestamp,
        text,
        id: Date.now() + Math.random()
      });

      // Keep only last maxMessages
      if (this.messages.length > this.maxMessages) {
        this.messages = this.messages.slice(-this.maxMessages);
      }
    },

    /**
     * Clear all log messages
     */
    clearLogs() {
      this.messages = [];
    },

    /**
     * Open log panel
     */
    openLog() {
      this.isOpen = true;
    },

    /**
     * Close log panel
     */
    closeLog() {
      this.isOpen = false;
    },

    /**
     * Toggle log panel
     */
    toggleLog() {
      this.isOpen = !this.isOpen;
    }
  }
});

/**
 * Settings Store - Manages user settings
 */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: JSON.parse(localStorage.getItem('iref_settings') || '{}'),
    isOpen: false
  }),

  getters: {
    /**
     * Get specific setting value
     */
    getSetting: (state) => (key, defaultValue = false) => {
      return state.settings[key] ?? defaultValue;
    },

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled: (state) => (featureId) => {
      return state.settings[featureId] === true;
    }
  },

  actions: {
    /**
     * Update a setting
     */
    updateSetting(key, value) {
      this.settings[key] = value;
      this.saveSettings();
    },

    /**
     * Update multiple settings
     */
    updateSettings(updates) {
      Object.assign(this.settings, updates);
      this.saveSettings();
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
      localStorage.setItem('iref_settings', JSON.stringify(this.settings));
    },

    /**
     * Reset settings to defaults
     */
    resetSettings() {
      this.settings = {};
      this.saveSettings();
    },

    /**
     * Open settings panel
     */
    openSettings() {
      this.isOpen = true;
    },

    /**
     * Close settings panel
     */
    closeSettings() {
      this.isOpen = false;
    },

    /**
     * Toggle settings panel
     */
    toggleSettings() {
      this.isOpen = !this.isOpen;
    }
  }
});
