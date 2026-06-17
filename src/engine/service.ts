import { db } from "../db/db";
import type {
  PeriodizationFocus,
  RoutineExerciseConfig,
  Workout,
} from "../db/types";
import type { ExercisePrescription } from "./prescription";

// ----------------------------------------------
// Engine service — STUBBED.
//
// The core workout-engine logic (progression, periodization modifiers,
// prescription, in-workout re-prescription, post-workout evaluation) has been
// removed and will be rewritten in a later session. These entrypoints keep their
// signatures and view types so the UI compiles, but they are inert: previews
// carry no prescriptions or engine state, and the post-workout passes are no-ops.
// ----------------------------------------------

/** An active deload as it would shape the upcoming session (always empty now). */
export interface ResetEffect {
  kind: "intensity" | "volume";
  multiplier: number;
  sessionsRemaining: number;
}

/** Everything that goes into one exercise's upcoming prescription. */
export interface ExercisePreview {
  exerciseId: string;
  name: string;
  config?: RoutineExerciseConfig;
  workingE1rm: number | null;
  failureStreak: number;
  currentTargetReps?: number;
  resetEffects: ResetEffect[];
  prescription: ExercisePrescription | null; // null without a prescription engine
}

export interface MesocyclePosition {
  weekIndex: number; // 0-based
  weekCount: number;
  focus: PeriodizationFocus;
  modifiers: { volume: number; intensity: number };
  workoutsThisWeek: number;
}

export interface WorkoutPreview {
  routineId: string;
  routineName: string;
  mesocycle: MesocyclePosition | null;
  exercises: ExercisePreview[];
}

/** One exercise's proposed working-e1RM recalibration, pending user confirmation. */
export interface RecalibrationProposal {
  exerciseId: string;
  exerciseName: string;
  workoutId: string;
  currentE1rm: number;
  sessionE1rm: number;
  proposedE1rm: number;
}

/**
 * Assembles the routine view for an upcoming workout from stored data so the
 * preview sheet still renders the exercises and their configs. The engine
 * fields are inert (no prescription, no e1RM, no streaks/deloads, no mesocycle)
 * until the prescription engine is rewritten.
 */
export async function previewWorkout(
  routineId: string,
): Promise<WorkoutPreview | null> {
  const routine = await db.routines.get(routineId);
  if (!routine) return null;

  const exercises: ExercisePreview[] = [];
  for (const routineExercise of routine.exercises) {
    const exercise = await db.exercises.get(routineExercise.exerciseId);
    if (!exercise) continue;
    exercises.push({
      exerciseId: routineExercise.exerciseId,
      name: exercise.name,
      config: routineExercise.config,
      workingE1rm: null,
      failureStreak: 0,
      resetEffects: [],
      prescription: null,
    });
  }

  return { routineId, routineName: routine.name, mesocycle: null, exercises };
}

/** No prescription engine yet — callers fall back to plain set counts. */
export async function prescribeWorkout(
  _routineId: string,
): Promise<ExercisePrescription[]> {
  return [];
}

/** Post-session engine pass — no-op until the engine is rewritten. */
export async function applyWorkoutResults(_workout: Workout): Promise<void> {}

/** No recalibration engine yet. */
export async function computeRecalibrations(
  _workout: Workout,
): Promise<RecalibrationProposal[]> {
  return [];
}

/** No recalibration engine yet — nothing to persist. */
export async function applyRecalibrations(
  _proposals: RecalibrationProposal[],
): Promise<void> {}
