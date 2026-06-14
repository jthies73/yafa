<script setup lang="ts">
import { computed } from "vue";
import { useWeightUnit } from "../../composables/useWeightUnit";
import type { PrResult } from "../../analytics/summary";

const props = defineProps<{ prs: PrResult[] }>();

const {
  label: weightUnit,
  format: fmtWeight,
  display: displayWeight,
} = useWeightUnit();

// Primary markers (e1RM, Rep) get the celebratory treatment; Exercise Volume is
// secondary and rendered subtly underneath.
const primary = computed(() =>
  props.prs.filter((p) => p.type === "e1rm" || p.type === "rep"),
);
const volumePrs = computed(() => props.prs.filter((p) => p.type === "volume"));


const headline = (p: PrResult): string =>
  p.type === "e1rm"
    ? fmtWeight(p.e1rm!)
    : `${p.reps} × ${fmtWeight(p.weight!)}`;

const detail = (p: PrResult): string => {
  if (p.type === "e1rm") {
    const base = `${p.reps} × ${fmtWeight(p.weight!)}`;
    return p.rpe != null ? `${base} @ RPE ${p.rpe}` : base;
  }
  return "Rep record at load";
};

const volumeLabel = (p: PrResult): string =>
  `${Math.round(displayWeight(p.volume!, 0)).toLocaleString()} ${weightUnit.value}`;
</script>

<template>
  <div v-if="primary.length || volumePrs.length" class="flex flex-col gap-2.5">
    <p
      class="text-xs font-semibold uppercase tracking-wider text-text-light dark:text-text-dark opacity-50 px-1"
    >
      Personal Records
    </p>

    <!-- Primary PRs: e1RM + Rep -->
    <div
      v-for="(pr, i) in primary"
      :key="`p-${i}`"
      class="flex items-center gap-3 rounded-xl border border-accent-border bg-accent-bg p-3.5"
    >
      <!-- Trophy badge -->
      <div
        class="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15 shrink-0"
      >
        <svg
          viewBox="0 0 24 24"
          class="w-5 h-5 text-accent"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path
            d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
          />
          <path
            d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
          />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      </div>

      <div class="min-w-0 flex-1">
        <span
          class="text-[0.65rem] font-bold uppercase tracking-wider text-accent"
        >
          {{ pr.type === "e1rm" ? "e1RM PR" : "Rep PR" }}
        </span>
        <p
          class="text-sm font-bold text-text-h-light dark:text-text-h-dark truncate"
        >
          {{ pr.exerciseName }}
        </p>
        <p
          class="text-xs text-text-light dark:text-text-dark opacity-60 truncate"
        >
          {{ detail(pr) }}
        </p>
      </div>

      <span
        class="text-base font-bold font-mono text-accent shrink-0 text-right"
      >
        {{ headline(pr) }}
      </span>
    </div>

    <!-- Secondary: Exercise Volume PRs, displayed subtly -->
    <div
      v-for="(pr, i) in volumePrs"
      :key="`v-${i}`"
      class="flex items-center justify-between gap-3 px-3.5 py-2"
    >
      <span
        class="text-xs text-text-light dark:text-text-dark opacity-70 truncate"
      >
        <span class="font-semibold">Volume PR</span> · {{ pr.exerciseName }}
      </span>
      <span
        class="text-xs font-mono font-semibold text-text-light dark:text-text-dark opacity-70 shrink-0"
      >
        {{ volumeLabel(pr) }}
      </span>
    </div>
  </div>
</template>
