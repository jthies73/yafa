<script setup lang="ts">
// A small "i" affordance placed next to an ambiguous label. Tapping it opens a
// bottom sheet (reusing AppBottomSheet) with a plain-language explanation pulled
// from the shared INFO_TOPICS registry — so every term in the app is one tap from
// a definition without cluttering the layout.
import { computed, ref } from "vue";
import AppBottomSheet from "./AppBottomSheet.vue";
import { INFO_TOPICS } from "./info/infoTopics";

const props = defineProps<{ topic: string }>();

const open = ref(false);
const info = computed(() => INFO_TOPICS[props.topic]);
</script>

<template>
  <!-- Render nothing if the topic key is unknown rather than a broken icon. -->
  <button
    v-if="info"
    type="button"
    class="inline-flex shrink-0 items-center justify-center text-text-light dark:text-text-dark opacity-40 hover:opacity-100 hover:text-accent cursor-pointer transition-colors duration-150"
    :aria-label="`About ${info.title}`"
    @click.stop.prevent="open = true"
  >
    <svg
      class="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" stroke-linecap="round" />
      <path d="M12 8h.01" stroke-linecap="round" />
    </svg>
  </button>

  <AppBottomSheet v-if="info" v-model:open="open" :title="info.title">
    <p
      class="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-text-light dark:text-text-dark"
    >
      {{ info.body }}
    </p>
  </AppBottomSheet>
</template>
