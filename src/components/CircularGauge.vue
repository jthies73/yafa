<script setup lang="ts">
import { computed } from "vue";

// A flat circular progress ring. The fill colour is data-driven (passed in by
// the parent), which Tailwind utility classes can't express from runtime
// values, so the stroke is applied inline. Center content is a slot.
const props = withDefaults(
  defineProps<{
    value: number; // 0..100
    color: string; // CSS colour for the progress arc
    size?: number; // px, outer box
    strokeWidth?: number; // px
  }>(),
  { size: 120, strokeWidth: 10 },
);

const radius = computed(() => (props.size - props.strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dashOffset = computed(() => {
  const pct = Math.max(0, Math.min(100, props.value));
  return circumference.value * (1 - pct / 100);
});
const center = computed(() => props.size / 2);
</script>

<template>
  <div
    class="relative shrink-0"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="-rotate-90"
    >
      <!-- Track -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        class="stroke-border-light dark:stroke-border-dark"
      />
      <!-- Progress arc -->
      <circle
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        style="transition: stroke-dashoffset 600ms ease"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <slot />
    </div>
  </div>
</template>
