<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { liveQuery } from "dexie";
import { db } from "../db/db";
import type { Plan, Routine, Exercise } from "../db/types";
import AppFab from "./AppFab.vue";

const props = defineProps<{
  id: string;
}>();

const router = useRouter();

const plan = ref<Plan | null>(null);
const routines = ref<Routine[]>([]);
const exercisesMap = ref<Record<string, Exercise>>({});
const loading = ref(true);

let subscription: any;

onMounted(() => {
  subscription = liveQuery(async () => {
    const p = await db.plans.get(props.id);
    if (!p) return null;

    const rList = await Promise.all(
      p.routineIds.map((rId) => db.routines.get(rId)),
    );
    const validRoutines = rList.filter((r): r is Routine => !!r);

    const exerciseIds = new Set<string>();
    for (const r of validRoutines) {
      for (const e of r.exercises) {
        exerciseIds.add(e.exerciseId);
      }
    }
    const eList = await Promise.all(
      Array.from(exerciseIds).map((eId) => db.exercises.get(eId)),
    );
    const eMap: Record<string, Exercise> = {};
    for (const e of eList) {
      if (e) eMap[e.id] = e;
    }

    return { plan: p, routines: validRoutines, exercisesMap: eMap };
  }).subscribe({
    next: (result) => {
      loading.value = false;
      if (result) {
        plan.value = result.plan;
        routines.value = result.routines;
        exercisesMap.value = result.exercisesMap;
      }
    },
    error: (err) => {
      loading.value = false;
      console.error("Error loading plan details:", err);
    },
  });
});

onUnmounted(() => {
  if (subscription) subscription.unsubscribe();
});

const goBack = () => {
  router.push({ name: "plans" });
};

const toggleActiveState = async () => {
  if (!plan.value) return;
  const nextActiveState = !plan.value.active;

  await db.transaction("rw", db.plans, async () => {
    if (nextActiveState) {
      // Set all other plans active to false
      const allPlans = await db.plans.toArray();
      for (const p of allPlans) {
        await db.plans.update(p.id, { active: p.id === props.id });
      }
    } else {
      // Just deactivate this plan
      await db.plans.update(props.id, { active: false });
    }
  });
};

const getProgressionType = (config?: any) => {
  if (!config) return "—";
  const model = config.progressionModel;
  if (model === "linear") return "Linear Progression";
  if (model === "double") return "Double Progression";
  if (model === "topset_backoff") return "Top Set + Back-Off Progression";
  return "Custom Progression";
};

const getSetsAndReps = (config?: any) => {
  if (!config) return "—";
  const model = config.progressionModel;
  const params = config.progressionParams;
  if (!params) return "—";

  if (model === "linear") {
    return `${params.targetSets} × ${params.targetReps}`;
  }
  if (model === "double") {
    return `${params.targetSets} × ${params.minReps}-${params.maxReps}`;
  }
  if (model === "topset_backoff") {
    return `1 × ${params.topSetTargetReps} + ${params.backOffSets} back-offs`;
  }
  return "Custom";
};

const handleRoutineClick = (routine: Routine) => {
  router.push({ name: "routine-details", params: { id: routine.id } });
};

const handleAddRoutine = () => {
  console.log("New Routine FAB clicked");
};
</script>

<template>
  <div class="p-6 relative min-h-full flex flex-col gap-6">
    <!-- Back Button & Page Header -->
    <div class="flex flex-col gap-4">
      <button
        class="inline-flex items-center gap-2 text-sm font-semibold text-text-light dark:text-text-dark hover:text-accent cursor-pointer transition-colors duration-150 self-start"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Plans
      </button>

      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2"
      >
        <div v-if="plan">
          <h1
            class="text-3xl font-bold tracking-tight text-text-h-light dark:text-text-h-dark"
          >
            {{ plan.name }}
          </h1>
          <p
            v-if="plan.description"
            class="text-sm text-text-light dark:text-text-dark opacity-85 mt-2"
          >
            {{ plan.description }}
          </p>
        </div>
        <div
          v-else-if="loading"
          class="h-10 w-48 bg-black/5 dark:bg-white/5 animate-pulse rounded-lg"
        ></div>

        <div v-if="plan" class="flex items-center gap-3">
          <span
            v-if="plan.active"
            class="px-2.5 py-1 text-xs font-bold bg-accent/20 text-accent rounded-md uppercase tracking-wider"
          >
            Active Plan
          </span>
          <button
            class="px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors duration-150 tracking-wider uppercase border"
            :class="
              plan.active
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/30'
                : 'bg-accent hover:bg-accent/90 text-bg-dark border-transparent'
            "
            @click="toggleActiveState"
          >
            {{ plan.active ? "Deactivate" : "Set as Active Plan" }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="flex-grow flex flex-col items-center justify-center p-12"
    >
      <div
        class="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"
      ></div>
    </div>

    <!-- Details View -->
    <div v-else-if="plan" class="flex flex-col gap-6">
      <div class="border-t border-border-light dark:border-border-dark pt-6">
        <h2
          class="text-xl font-bold text-text-h-light dark:text-text-h-dark mb-4"
        >
          Routines Configuration
        </h2>

        <div
          v-if="routines.length === 0"
          class="text-sm italic text-text-light dark:text-text-dark opacity-60"
        >
          No routines configured for this plan.
        </div>

        <div v-else class="flex flex-col gap-6">
          <!-- Loop through routines -->
          <div
            v-for="routine in routines"
            :key="routine.id"
            class="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden cursor-pointer transition-colors duration-150 hover:bg-surface-light-hover dark:hover:bg-surface-dark-hover flex flex-col"
            @click="handleRoutineClick(routine)"
          >
            <!-- Routine Title -->
            <div
              class="bg-black/5 dark:bg-white/5 px-5 py-4 border-b border-border-light dark:border-border-dark"
            >
              <h3
                class="text-lg font-bold text-text-h-light dark:text-text-h-dark"
              >
                {{ routine.name }}
              </h3>
            </div>

            <!-- Exercises List -->
            <div class="p-5">
              <div
                v-if="routine.exercises.length === 0"
                class="text-sm italic opacity-50"
              >
                No exercises configured for this routine.
              </div>

              <div v-else class="flex flex-col gap-4">
                <div
                  v-for="(rEx, idx) in routine.exercises"
                  :key="rEx.exerciseId + '-' + idx"
                  class="flex items-start justify-between border-b border-border-light dark:border-border-dark pb-3.5 last:border-0 last:pb-0 gap-4"
                >
                  <div class="flex flex-col min-w-0 flex-grow">
                    <div class="flex items-start gap-2">
                      <span
                        class="text-sm font-semibold text-text-light dark:text-text-dark opacity-50 shrink-0 mt-0.5"
                      >
                        {{ idx + 1 }}.
                      </span>
                      <h4
                        class="font-bold text-text-h-light dark:text-text-h-dark text-sm sm:text-base break-words"
                      >
                        {{
                          exercisesMap[rEx.exerciseId]?.name ||
                          "Loading Exercise..."
                        }}
                      </h4>
                    </div>
                    <span
                      class="text-xs text-text-light dark:text-text-dark opacity-60 pl-5 mt-0.5 break-words"
                    >
                      {{ getProgressionType(rEx.config) }}
                    </span>
                  </div>
                  <div class="text-right shrink-0 max-w-[45%] flex justify-end">
                    <span
                      class="text-xs sm:text-sm text-text-h-light dark:text-text-h-dark font-mono font-semibold break-words text-right"
                    >
                      {{ getSetsAndReps(rEx.config) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error/Not Found state -->
    <div
      v-else
      class="flex-grow flex flex-col items-center justify-center p-12 text-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-red-500 mb-3"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2
        class="text-xl font-bold text-text-h-light dark:text-text-h-dark mb-1"
      >
        Plan not found
      </h2>
      <p class="text-sm text-text-light dark:text-text-dark opacity-70 mb-4">
        The requested training plan could not be located in the database.
      </p>
      <button
        class="px-4 py-2 bg-accent hover:bg-accent/90 text-bg-dark text-xs font-bold rounded-lg cursor-pointer transition-colors duration-150 tracking-wider uppercase"
        @click="goBack"
      >
        Go to Plans
      </button>
    </div>

    <!-- FAB Button -->
    <AppFab v-if="plan" label="New Routine" @click="handleAddRoutine" />
  </div>
</template>
