<template>
  <div class="iref-bar-wrapper">
    <div class="iref-status-bar">
      <div class="iref-bar-left">
        <div class="iref-logo">
          <img :src="logoUrl" alt="iRefined" />
        </div>
        <div class="iref-queue-items">
          <QueueItem
            v-for="item in sortedQueue"
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
      <div class="iref-bar-right">
        <LogButton />
        <SettingsButton />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useQueueStore } from '../store/index.js';
import QueueItem from './QueueItem.vue';
import LogButton from './LogButton.vue';
import SettingsButton from './SettingsButton.vue';

const queueStore = useQueueStore();

// Import logo (Vite will handle this)
const logoUrl = new URL('../../assets/logo.png', import.meta.url).href;

const sortedQueue = computed(() => queueStore.sortedQueue);
const queueCount = computed(() => queueStore.queueCount);
</script>

<style scoped>
/* StatusBar styles are defined in the Vue component's scoped style section */
/* Adjustment for iRacing UI when status bar is present */
:global(.css-3klkag),
:global(.css-5p3npk),
:global(.css-uam05f) {
  height: calc(100vh - 51px);
}

:global(#friends-wrapper) {
  margin-bottom: 37px;
}

.iref-bar-wrapper {
  position: absolute;
  width: 100%;
  height: 51px;
  background-color: var(--iref-bg-secondary);
  bottom: 1px;
  padding-bottom: 5px;
}

.iref-status-bar {
  display: flex;
  width: calc(100% - 20px);
  margin-left: 10px;
  height: 41px;
  border: 1px solid var(--iref-border-color);
  border-radius: 41px;
  background: var(--iref-bg-primary);
  color: var(--iref-text-primary);
  box-shadow: rgba(5, 5, 15, 0.16) 0px 12px 24px -2px;
  overflow: hidden;
}

.iref-logo {
  width: 70px;
  background-color: var(--iref-bar-highlight);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.iref-logo img {
  height: 11px;
}

.iref-bar-left {
  flex-grow: 1;
  display: flex;
}

.iref-queue-items {
  display: flex;
  flex-grow: 1;
  align-items: center;
}

.iref-queue-item {
  margin: 0 5px;
  padding: 4px 8px;
  background: var(--iref-bg-secondary);
  color: var(--iref-text-primary);
  height: 30px;
  border-radius: 5px;
}

.iref-remove-btn {
  font-size: 36px;
  line-height: 0px;
  transform: translate(5px, 5px);
}

.iref-bar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.iref-queue-status {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-right: 8px;
  transform: translateY(2px);
}

.iref-queue-status.found {
  background-color: #005db4;
  cursor: pointer;
}

.iref-queue-status.registering {
  background-color: #06bd00;
}

.iref-queue-status.queued {
  background-color: gray;
}
</style>
