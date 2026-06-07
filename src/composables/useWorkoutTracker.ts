import { ref, watch } from "vue";
import type {
  LinearProgressionParams,
  DoubleProgressionParams,
  TopSetProgressionParams,
} from "../db/types";
import { useActiveWorkout } from "./useActiveWorkout";

export interface SetEntry {
  reps: string;
  weight: string;
  rpe: string;
  done: boolean;
}

export interface ExerciseCard {
  id: string; // stable key so reordering never re-creates the wrong card
  exerciseId: string;
  sets: SetEntry[];
}

// Mirror the row's own validity checks exactly (RPE is not required to complete).
export const setValid = (s: SetEntry) =>
  parseInt(s.reps, 10) >= 1 && parseFloat(s.weight) > 0;

// A set counts as completed only while its inputs remain valid, so clearing a
// value auto-uncompletes the set and retyping a valid one restores it.
export const isDone = (s: SetEntry) => s.done && setValid(s);

export function useWorkoutTracker() {
  const { activeWorkout, routine, exercisesMap } = useActiveWorkout();

  const cards = ref<ExerciseCard[]>([]);

  // Names of exercises added on the fly (not part of the original routine) so the
  // card header can resolve them without round-tripping through the composable.
  const addedNames = ref<Record<string, string>>({});

  const newSet = (): SetEntry => ({
    reps: "",
    weight: "",
    rpe: "",
    done: false,
  });

  function plannedSetCount(index: number): number {
    const config = routine.value?.exercises[index]?.config;
    if (!config) return 3;
    const p = config.progressionParams;
    if (config.progressionModel === "topset_backoff") {
      return 1 + ((p as TopSetProgressionParams).backOffSets ?? 0);
    }
    return (
      (p as LinearProgressionParams | DoubleProgressionParams).targetSets ?? 3
    );
  }

  function rebuild() {
    if (!activeWorkout.value) {
      cards.value = [];
      return;
    }
    addedNames.value = {};
    cards.value = activeWorkout.value.exercises.map((we, i) => ({
      id: crypto.randomUUID(),
      exerciseId: we.exerciseId,
      sets: Array.from({ length: plannedSetCount(i) }, newSet),
    }));
  }

  watch(() => activeWorkout.value?.id, rebuild, { immediate: true });

  const exerciseName = (id: string) =>
    exercisesMap.value[id]?.name || addedNames.value[id] || "Exercise";

  const addSet = (card: ExerciseCard) => {
    card.sets.push(newSet());
  };

  const deleteSet = (card: ExerciseCard, i: number) => {
    card.sets.splice(i, 1);
  };

  const deleteExercise = (card: ExerciseCard) => {
    cards.value = cards.value.filter((c) => c.id !== card.id);
  };

  const setState = (
    card: ExerciseCard,
    i: number,
  ): "finished" | "current" | "upcoming" => {
    if (isDone(card.sets[i])) return "finished";
    // The lowest set that isn't effectively done is the one to act on next.
    const firstIncomplete = card.sets.findIndex((s) => !isDone(s));
    return i === firstIncomplete ? "current" : "upcoming";
  };

  const toggleSet = (card: ExerciseCard, i: number) => {
    card.sets[i].done = !card.sets[i].done;
  };

  const addCardFor = (id: string, name: string) => {
    addedNames.value[id] = name;
    cards.value.push({
      id: crypto.randomUUID(),
      exerciseId: id,
      sets: [newSet()],
    });
  };

  const reorderCards = (from: number, to: number) => {
    const list = cards.value.slice();
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    cards.value = list;
  };

  return {
    cards,
    addedNames,
    exerciseName,
    addSet,
    deleteSet,
    deleteExercise,
    setState,
    toggleSet,
    addCardFor,
    reorderCards,
    setValid,
    isDone,
  };
}
