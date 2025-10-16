<template>
  <button
    type="button"
    class="iref-log-btn"
    aria-label="Console Log"
    tabindex="0"
    @click="toggleLog"
    :title="logStore.messages.length + ' log messages'"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18px"
      height="18px"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
    <span v-if="logStore.messages.length > 0" class="log-badge">
      {{ logStore.messages.length }}
    </span>
  </button>
</template>

<script setup>
import { useLogStore } from '../store/index.js';

const logStore = useLogStore();

function toggleLog() {
  logStore.toggleLog();
}
</script>

<style scoped>
.iref-log-btn {
  background: var(--iref-bg-secondary);
  border: 1px solid var(--iref-border-color);
  height: 32px;
  width: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  position: relative;
  transition: all 0.2s ease;
}

.iref-log-btn:hover {
  background: var(--iref-bg-tertiary);
  border-color: var(--iref-bar-highlight);
}

.iref-log-btn svg {
  color: var(--iref-text-primary);
}

.log-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--iref-bar-highlight);
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}
</style>
