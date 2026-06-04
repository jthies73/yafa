<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { db } from "../db/db";
import type { Exercise } from "../db/types";
import AppBottomSheet from "./AppBottomSheet.vue";

const open = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
  (e: "select", exercise: Exercise): void;
}>();

const allExercises = ref<Exercise[]>([]);
const searchQuery = ref("");

watch(open, async (isOpen) => {
  if (isOpen) {
    searchQuery.value = "";
    allExercises.value = await db.exercises.orderBy("name").toArray();
  }
});

const filteredExercises = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return allExercises.value;
  return allExercises.value.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.primaryMuscleGroup.toLowerCase().includes(q),
  );
});

const select = (exercise: Exercise) => {
  emit("select", exercise);
};
</script>

<template>
  <AppBottomSheet v-model:open="open" title="Select Exercise">
    <template #subheader>
      <div class="px-5 py-3 shrink-0">
        <div class="relative">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-text-light dark:text-text-dark opacity-50"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search exercises..."
            class="w-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg py-2.5 pl-9 pr-4 text-sm text-text-h-light dark:text-text-h-dark placeholder-text-light/40 dark:placeholder-text-dark/40 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
          />
        </div>
      </div>
    </template>

    <!-- Empty DB state -->
    <div
      v-if="allExercises.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center px-8"
    >
      <p class="text-sm text-text-light dark:text-text-dark opacity-50 mb-1">
        No exercises in database.
      </p>
      <p class="text-xs text-text-light dark:text-text-dark opacity-35">
        Add exercises from the Exercises page first.
      </p>
    </div>

    <!-- No search results -->
    <div
      v-else-if="filteredExercises.length === 0"
      class="flex flex-col items-center justify-center py-16"
    >
      <p class="text-sm text-text-light dark:text-text-dark opacity-50">
        No exercises match "{{ searchQuery }}"
      </p>
    </div>

    <!-- Exercise rows -->
    <button
      v-for="exercise in filteredExercises"
      :key="exercise.id"
      class="w-full flex items-center justify-between px-5 py-3.5 border-b border-border-light dark:border-border-dark last:border-0 hover:bg-surface-light dark:hover:bg-surface-dark cursor-pointer transition-colors duration-150 text-left"
      @click="select(exercise)"
    >
      <span
        class="font-semibold text-sm text-text-h-light dark:text-text-h-dark"
      >
        {{ exercise.name }}
      </span>
      <span
        class="text-xs bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark px-2 py-0.5 rounded-md text-text-light dark:text-text-dark shrink-0 ml-3"
      >
        {{ exercise.primaryMuscleGroup }}
      </span>
    </button>

    <!-- Bottom padding for safe area -->
    <div class="h-6"></div>
  </AppBottomSheet>
</template>
