<template>
  <Teleport to="body">
    <div v-if="settingsStore.isOpen" class="iref-modal-overlay" @click.self="closeSettings">
      <div class="iref-modal">
        <div class="modal-header">
          <button class="close" @click="closeSettings">
            <i class="icon-cancel"></i>
          </button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            style="float: left; margin-right: 7px"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
          <h6 class="modal-title">iRefined Settings</h6>
        </div>

        <div class="modal-body">
          <h1><strong>Settings</strong></h1>

          <div class="settings-list">
            <label class="iref-setting">
              <i class="icon-information text-info" title="Adds download and upload buttons to the session settings window so that conditions can be shared using .json"></i>
              Test Drive session sharing buttons
              <input type="checkbox" v-model="settings['share-test-session']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Adds download and upload buttons to the session settings window so that session setup can be shared using .json"></i>
              Hosted/League session sharing buttons
              <input type="checkbox" v-model="settings['share-hosted-session']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Adds queue buttons to future races to automatically register to them when available. You must select a car to queue with. Will forfeit/withdraw your current session when queued session becomes available. To reset your queue restart the UI."></i>
              Queue system for future sessions
              <input type="checkbox" v-model="settings['auto-register']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Green join button will display session type. Doesn't work well with official sessions that don't go official (low attendance)."></i>
              Join button displays session type
              <input type="checkbox" v-model="settings['better-join-button']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Automatically launch the sim for all or official race only sessions. Doesn't work well with official sessions that don't go official (low attendance)."></i>
              Auto join
              <select v-model="settings['auto-join-type']">
                <option value="race">scored</option>
                <option value="all">all</option>
              </select>
              sessions
              <input type="checkbox" v-model="settings['auto-join']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Automatically forfeit official race sessions. Only activates if the sim is running. Recommended to not forfeit before warmup and quali is complete."></i>
              Auto forfeit after
              <input type="number" v-model.number="settings['auto-forfeit-m']" :placeholder="13" />
              minutes
              <input type="checkbox" v-model="settings['auto-forfeit']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Don't show any notifications at the top of the screen."></i>
              No notifications
              <input type="checkbox" v-model="settings['no-toasts']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Close notifications at the top of the screen after a delay. Does not work with the previous option."></i>
              Auto close notifications after
              <input type="number" v-model.number="settings['toast-timeout-s']" :placeholder="5" />
              seconds
              <input type="checkbox" v-model="settings['auto-close-toasts']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Hide the left and right sidebars for a cleaner UI with more space."></i>
              Hide sidebars
              <input type="checkbox" v-model="settings['no-sidebars']" />
            </label>

            <label class="iref-setting">
              <i class="icon-information text-info" title="Folds in the left hand menu so that it only uses icons, to free up even more space for more important stuff."></i>
              Collapse menu
              <input type="checkbox" v-model="settings['collapse-menu']" />
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <div class="pull-xs-left">
            <button class="btn btn-md btn-secondary" @click="closeSettings">
              <i class="icon-cancel"></i> Close
            </button>
            <button class="btn btn-md btn-secondary" @click="reloadUI">
              Reload without iRef
            </button>
          </div>
          <div class="pull-xs-right">
            <button class="btn btn-success" @click="saveSettings">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { useSettingsStore } from '../store/index.js';

const settingsStore = useSettingsStore();

// Local copy of settings for editing
const settings = reactive({ ...settingsStore.settings });

// Watch for store changes and update local copy
watch(() => settingsStore.settings, (newSettings) => {
  Object.assign(settings, newSettings);
}, { deep: true });

// Set default values if not present
if (settings['auto-forfeit-m'] === undefined) settings['auto-forfeit-m'] = 13;
if (settings['toast-timeout-s'] === undefined) settings['toast-timeout-s'] = 5;
if (settings['auto-join-type'] === undefined) settings['auto-join-type'] = 'race';

function closeSettings() {
  settingsStore.closeSettings();
}

function saveSettings() {
  settingsStore.updateSettings(settings);

  // Reload features with new settings
  if (window.irefFeatures) {
    window.irefFeatures.reloadAll();
  }

  closeSettings();
}

function reloadUI() {
  location.reload();
}
</script>

<style scoped>
/* Modal overlay */
.iref-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--iref-modal-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* Modal content */
.iref-modal {
  background: var(--iref-bg-tertiary);
  border: 1px solid var(--iref-border-color);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  color: var(--iref-text-primary);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--iref-border-color);
  display: flex;
  align-items: center;
  position: relative;
}

.modal-header .close {
  position: absolute;
  right: 20px;
  top: 20px;
  background: none;
  border: none;
  color: var(--iref-text-primary);
  font-size: 24px;
  cursor: pointer;
}

.modal-title {
  margin: 0;
  font-size: 18px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.settings-list {
  margin-top: 20px;
}

.iref-setting {
  display: block;
  padding: 12px 0;
  border-bottom: 1px dotted var(--iref-border-subtle);
  margin-bottom: 12px;
}

.iref-setting input[type="checkbox"] {
  float: right;
  transform: translateY(4px);
}

.iref-setting input[type="number"] {
  display: inline-block;
  width: 35px;
  color: var(--iref-text-primary);
  background: var(--iref-bg-secondary);
  font-size: 16px;
  font-weight: 700;
  margin: 0 6px;
  text-align: center;
  border: 1px solid var(--iref-border-subtle) !important;
  border-radius: 4px;
}

.iref-setting select {
  display: inline-block;
  color: var(--iref-text-primary);
  background: var(--iref-bg-secondary);
  font-size: 16px;
  font-weight: 700;
  margin: 0 6px;
  text-align: center;
  border: 1px solid var(--iref-border-subtle) !important;
  border-radius: 4px;
  padding: 0 6px;
}

.iref-setting select option {
  background-color: var(--iref-bg-secondary);
  color: var(--iref-text-primary);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--iref-border-color);
  display: flex;
  justify-content: space-between;
}

.text-muted {
  color: var(--iref-text-muted);
  font-style: italic;
  margin-top: 20px;
}
</style>
