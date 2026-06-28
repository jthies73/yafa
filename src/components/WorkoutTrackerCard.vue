<script setup lang="ts">
import { ref } from "vue";
import type { ExerciseCard } from "../composables/useWorkoutTracker";
import { isDone } from "../composables/useWorkoutTracker";
import WorkoutSetRow from "./WorkoutSetRow.vue";
import InfoIcon from "./InfoIcon.vue";

const props = defineProps<{
  card: ExerciseCard;
  exerciseName: string;
  /** Fold the sets section away (used while the card is being dragged). */
  collapsed?: boolean;
  /** Per-set flag: whether a re-prescription proposal is available. */
  proposalFlags?: boolean[];
  /** Show the note indicator (a global or this-workout note exists). */
  hasNote?: boolean;
}>();

const emit = defineEmits<{
  (e: "open-notes"): void;
  (e: "request-delete-set", index: number): void;
  (e: "edit-rpe", index: number): void;
  (e: "complete", index: number, field: "reps" | "weight"): void;
  (e: "add-set"): void;
  (e: "toggle-set", index: number): void;
  (e: "open-proposal", index: number, rect: DOMRect): void;
  (e: "open-detail"): void;
}>();

const rowRefs = ref<Record<number, InstanceType<typeof WorkoutSetRow> | null>>(
  {},
);

const setRowRef = (index: number) => (el: unknown) => {
  rowRefs.value[index] = el as InstanceType<typeof WorkoutSetRow> | null;
};

const setState = (i: number): "finished" | "current" | "upcoming" => {
  if (isDone(props.card.sets[i])) return "finished";
  // The lowest set that isn't effectively done is the one to act on next.
  const firstIncomplete = props.card.sets.findIndex((s) => !isDone(s));
  return i === firstIncomplete ? "current" : "upcoming";
};

const focusSet = (index: number, field: "reps" | "weight" = "reps") => {
  const row = rowRefs.value[index];
  if (field === "weight") row?.focusWeight();
  else row?.focusReps();
};

defineExpose({
  focusSet,
});
</script>

<template>
  <div
    class="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4 shadow-sm flex flex-col gap-3 select-none"
  >
    <!-- Card header -->
    <div class="mb-3 flex items-center gap-2.5">
      <!-- Drag handle -->
      <span
        class="drag-handle shrink-0 touch-none cursor-grab active:cursor-grabbing text-text-light dark:text-text-dark opacity-30 hover:opacity-60 transition-opacity duration-150 inline-flex items-center justify-center h-5 w-3.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </span>
      <button
        type="button"
        class="min-w-0 flex-1 text-left font-bold text-sm text-text-h-light dark:text-text-h-dark truncate cursor-pointer hover:text-accent transition-colors duration-150"
        title="View exercise details"
        @click="emit('open-detail')"
      >
        {{ exerciseName }}
      </button>
      <!-- Note indicator (a note exists for this exercise) -->
      <svg
        v-if="hasNote"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="shrink-0 text-accent"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
      <!-- Exercise menu (notes + remove) -->
      <button
        type="button"
        class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-text-light dark:text-text-dark opacity-40 hover:opacity-100 hover:text-accent cursor-pointer transition-colors duration-150"
        title="Notes & options"
        @click="emit('open-notes')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
    </div>

    <!-- Sets (folds away while dragging) -->
    <div
      class="grid transition-[grid-template-rows,opacity] duration-150 ease-out"
      :class="
        collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
      "
    >
      <div class="min-h-0 overflow-hidden">
        <div class="flex flex-col gap-2">
          <!-- Column labels -->
          <div class="flex items-center gap-2.5 px-0.5">
            <span class="w-5 shrink-0" />
            <span
              class="flex-1 text-center text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-40"
              >Reps</span
            >
            <span class="text-xs opacity-0">×</span>
            <span
              class="flex-1 text-center text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-40"
              >Weight</span
            >
            <span class="text-xs opacity-0">@</span>
            <span class="flex w-14 shrink-0 items-center justify-center gap-1">
              <span
                class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-40"
                >RPE</span
              >
              <InfoIcon topic="rpe" />
            </span>
            <span class="w-9 shrink-0" />
          </div>

          <WorkoutSetRow
            v-for="(set, setIndex) in card.sets"
            :key="setIndex"
            :ref="setRowRef(setIndex)"
            v-model:reps="set.reps"
            v-model:weight="set.weight"
            v-model:rpe="set.rpe"
            :index="setIndex + 1"
            :state="setState(setIndex)"
            :target="set.target"
            :has-proposal="proposalFlags?.[setIndex] ?? false"
            @toggle="emit('toggle-set', setIndex)"
            @complete="(field) => emit('complete', setIndex, field)"
            @edit-rpe="emit('edit-rpe', setIndex)"
            @delete="emit('request-delete-set', setIndex)"
            @open-proposal="
              (rect: DOMRect) => emit('open-proposal', setIndex, rect)
            "
          />

          <!-- Add set -->
          <button
            type="button"
            class="mt-1 w-full rounded-lg border border-dashed border-border-light dark:border-border-dark py-2 text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-50 transition-colors duration-150 hover:opacity-100 hover:border-accent/50 hover:text-accent cursor-pointer"
            @click="emit('add-set')"
          >
            + Add set
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
