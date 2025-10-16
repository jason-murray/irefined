<template>
  <Teleport to="body">
    <div v-if="logStore.isOpen" class="iref-log-panel-overlay" @click.self="closeLog">
      <div class="iref-log-panel">
        <div class="log-header">
          <h6 class="log-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20px"
              height="20px"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="display: inline-block; vertical-align: middle; margin-right: 8px;"
            >
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            Console Log
          </h6>
          <button class="close" @click="closeLog">
            <i class="icon-cancel"></i>
          </button>
        </div>

        <div class="log-body">
          <div v-if="logStore.messages.length === 0" class="log-empty">
            No log messages yet...
          </div>
          <div v-else class="log-messages">
            <div
              v-for="(message, index) in logStore.messages"
              :key="index"
              class="log-message"
            >
              <span class="log-timestamp">{{ message.timestamp }}</span>
              <span class="log-text" v-html="message.text"></span>
            </div>
          </div>
        </div>

        <div class="log-footer">
          <button class="btn btn-sm btn-secondary" @click="clearLogs">
            Clear Logs
          </button>
          <button class="btn btn-sm btn-secondary" @click="closeLog">
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useLogStore } from '../store/index.js';
import { onMounted, watch, nextTick } from 'vue';

const logStore = useLogStore();

function closeLog() {
  logStore.closeLog();
}

function clearLogs() {
  logStore.clearLogs();
}

// Auto-scroll to bottom when new messages arrive
watch(() => logStore.messages.length, async () => {
  await nextTick();
  const messagesContainer = document.querySelector('.log-messages');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
});
</script>

<style scoped>
.iref-log-panel-overlay {
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

.iref-log-panel {
  background: var(--iref-bg-tertiary);
  border: 1px solid var(--iref-border-color);
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  color: var(--iref-text-primary);
}

.log-header {
  padding: 20px;
  border-bottom: 1px solid var(--iref-border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.log-title {
  margin: 0;
  font-size: 18px;
  display: flex;
  align-items: center;
}

.log-header .close {
  background: none;
  border: none;
  color: var(--iref-text-primary);
  font-size: 24px;
  cursor: pointer;
}

.log-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-empty {
  color: var(--iref-text-muted);
  text-align: center;
  padding: 40px;
}

.log-messages {
  max-height: 50vh;
  overflow-y: auto;
}

.log-message {
  margin-bottom: 8px;
  padding: 4px 0;
}

.log-timestamp {
  color: var(--iref-text-muted);
  margin-right: 12px;
  font-size: 12px;
}

.log-text {
  color: var(--iref-text-primary);
}

.log-footer {
  padding: 20px;
  border-top: 1px solid var(--iref-border-color);
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
</style>
