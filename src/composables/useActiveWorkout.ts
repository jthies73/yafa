import { ref, computed } from "vue";
import { db } from "../db/db";
import type { Workout, Routine, Exercise } from "../db/types";
import { applyWorkoutResults } from "../engine/service";

const activeWorkout = ref<Workout | null>(null);
const routine = ref<Routine | null>(null);
const exercisesMap = ref<Record<string, Exercise>>({});
const isMinimized = ref(false);
const showSheet = ref(false);

function reset() {
  activeWorkout.value = null;
  routine.value = null;
  exercisesMap.value = {};
  isMinimized.value = false;
  showSheet.value = false;
}

export function useActiveWorkout() {
  const startWorkout = async (routineId?: string) => {
    let r: Routine | null = null;
    const eMap: Record<string, Exercise> = {};

    if (routineId) {
      r = (await db.routines.get(routineId)) ?? null;
      if (r) {
        const ids = new Set(r.exercises.map((e) => e.exerciseId));
        const list = await Promise.all(
          [...ids].map((id) => db.exercises.get(id)),
        );
        for (const e of list) if (e) eMap[e.id] = e;
      }
    }

    activeWorkout.value = {
      id: crypto.randomUUID(),
      routineId: routineId ?? "",
      startTime: Date.now(),
      exercises: (r?.exercises ?? []).map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: [],
      })),
    };
    routine.value = r;
    exercisesMap.value = eMap;
    isMinimized.value = false;
    showSheet.value = true;
  };

  const finishWorkout = async () => {
    if (!activeWorkout.value) return;
    const completed: Workout = { ...activeWorkout.value, endTime: Date.now() };
    await db.workouts.add(completed);
    // Post-session engine pass: matrix learning, e1RM/streak bookkeeping,
    // reset modifier decay. No-ops for exercises without logged sets.
    await applyWorkoutResults(completed);
    reset();
  };

  const maximize = () => {
    showSheet.value = true;
    isMinimized.value = false;
  };

  return {
    activeWorkout: computed(() => activeWorkout.value),
    routine: computed(() => routine.value),
    exercisesMap: computed(() => exercisesMap.value),
    isMinimized: computed({
      get: () => isMinimized.value,
      set: (val) => {
        isMinimized.value = val;
      },
    }),
    showSheet: computed({
      get: () => showSheet.value,
      set: (val) => {
        showSheet.value = val;
      },
    }),
    startWorkout,
    finishWorkout,
    discardWorkout: reset,
    maximize,
  };
}
