<template>
  <div class="iref-queue-item">
    <span
      :class="['iref-queue-status', item.status]"
      :title="tooltipText"
      @click="handleClick"
    ></span>
    {{ item.season_name }} - {{ countdown }}
    <button
      class="iref-remove-btn"
      @click="handleRemove"
      :style="{ marginRight: '5px', color: 'var(--iref-bar-highlight)' }"
    >
      ×
    </button>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useQueueStore } from '../store/index.js';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const queueStore = useQueueStore();
const countdown = ref('');

// Format countdown timer
function formatCountdown(targetTime) {
  const now = new Date();
  const target = new Date(targetTime);
  const diff = target - now;

  if (diff <= 5 * 60 * 1000) {
    return 'Registering';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Update countdown every second
let intervalId;
onMounted(() => {
  countdown.value = formatCountdown(props.item.start_time);
  intervalId = setInterval(() => {
    countdown.value = formatCountdown(props.item.start_time);
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

// Tooltip text based on status
const tooltipText = computed(() => {
  switch (props.item.status) {
    case 'found':
      return 'Race session found, you will be registered 5 minutes before the start time. Click to register now.';
    case 'registering':
      return 'Registering, this can take up to 30 seconds.';
    case 'queued':
      return 'Searching for race session.';
    default:
      return '';
  }
});

// Handle click to activate queue item
function handleClick() {
  if (props.item.status === 'found') {
    // Import activateQueueItem function from auto-register
    // For now, we'll dispatch an event that the feature can listen for
    window.dispatchEvent(new CustomEvent('iref:activate-queue', {
      detail: { queueId: props.item.id }
    }));
  }
}

// Handle remove button
function handleRemove() {
  queueStore.removeFromQueue(props.item.id);

  // Re-enable any disabled register buttons
  document.querySelectorAll('.iref-disabled').forEach(btn => {
    btn.classList.remove('iref-disabled');
    btn.classList.add('btn-success');
    btn.innerHTML = 'Register';
  });
}
</script>
