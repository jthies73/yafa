<script setup lang="ts">
import { ref } from "vue";
import { useWeightUnit } from "../../composables/useWeightUnit";
import type { RecalibrationProposal } from "../../engine/recalibration";

const props = defineProps<{ recalibrations: RecalibrationProposal[] }>();
const emit = defineEmits<{ confirm: [] }>();

const { format: fmtWeight } = useWeightUnit();

// Local latch: once applied, swap the action for a confirmed state so the
// prompt resolves in place rather than vanishing.
const applied = ref(false);

const apply = () => {
  if (applied.value) return;
  applied.value = true;
  emit("confirm");
};

const divergenceLabel = (p: RecalibrationProposal): string => {
  const pct = Math.round((p.sessionE1rm / p.currentE1rm - 1) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
};

const isUp = (p: RecalibrationProposal): boolean =>
  p.sessionE1rm >= p.currentE1rm;
</script>

<template>
  <div
    v-if="recalibrations.length"
    class="flex flex-col gap-2.5 rounded-xl border border-accent-border bg-accent-bg p-3.5"
  >
    <!-- Header -->
    <div class="flex flex-col gap-0.5">
      <span
        class="text-[0.65rem] font-bold uppercase tracking-wider text-accent"
      >
        Recalibration
      </span>
      <p class="text-xs text-text-light dark:text-text-dark opacity-70">
        Your demonstrated strength has drifted from the working estimate. Apply
        to re-baseline future prescriptions.
      </p>
    </div>

    <!-- Per-exercise current → proposed -->
    <div class="flex flex-col gap-2">
      <div
        v-for="(p, i) in recalibrations"
        :key="i"
        class="flex items-center gap-3"
      >
        <div class="min-w-0 flex-1">
          <p
            class="text-sm font-bold text-text-h-light dark:text-text-h-dark truncate"
          >
            {{ p.exerciseName }}
          </p>
          <p
            class="text-xs font-mono text-text-light dark:text-text-dark opacity-60"
          >
            {{ fmtWeight(p.currentE1rm) }} → {{ fmtWeight(p.proposedE1rm) }}
          </p>
        </div>
        <span
          class="text-xs font-bold font-mono shrink-0"
          :class="isUp(p) ? 'text-accent' : 'text-amber-500'"
        >
          {{ divergenceLabel(p) }}
        </span>
      </div>
    </div>

    <!-- Action / confirmed state -->
    <button
      v-if="!applied"
      class="w-full py-2.5 bg-accent hover:bg-accent-hover text-bg-dark font-bold rounded-lg cursor-pointer transition-colors duration-150 text-xs tracking-wide uppercase"
      @click="apply"
    >
      Apply Recalibration
    </button>
    <p v-else class="text-xs font-semibold text-accent text-center py-1.5">
      Recalibration applied
    </p>
  </div>
</template>
