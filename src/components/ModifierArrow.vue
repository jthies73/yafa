<script setup lang="ts">
// A simple colored arrow for target shifts: up/green = increase, down/red = decrease.
// It accepts a 'direction' prop: 'up' or 'down'.
defineProps<{
  direction: "up" | "down";
}>();
</script>

<template>
  <span
    class="inline-flex items-center justify-center"
    :class="
      direction === 'up'
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400'
    "
  >
    <!-- Up arrow (standard Lucide arrow-up svg centered) -->
    <svg
      v-if="direction === 'up'"
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="align-middle"
    >
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
    <!-- Down arrow (standard Lucide arrow-down svg centered) -->
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="align-middle"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>
  </span>
</template>
