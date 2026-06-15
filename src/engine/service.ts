import { db } from "../db/db";
import { DEFAULT_RPE_MATRIX } from "../db/rpeMatrix";
import type {
  Exercise,
  PeriodizationFocus,
  ProgressionState,
  ResetKind,
  RoutineExerciseConfig,
  RpeMatrix,
  Set as LoggedSet,
  Workout,
} from "../db/types";
import { FOCUS_MODIFIERS, type FocusModifiers } from "../config/periodization";
import { QUALIFYING_MAX_REPS } from "./config";
import {
  applyMatrixUpdates,
  impliedE1rm,
  isQualifyingSet,
  peakImpliedE1rm,
} from "./matrix";
import {
  proposeRecalibrationE1rm,
  type RecalibrationProposal,
} from "./recalibration";
import {
  mesocycleWeekIndex,
  resolveMesocycleWeek,
  weekStart,
} from "./mesocycle";
import { advanceProgression } from "./progression";
import { prescribeExercise, type ExercisePrescription } from "./prescription";
import { effectiveMagnitude, isExpired, tickModifiers } from "./resets";

// ----------------------------------------------
// Engine service: the only layer that touches Dexie. Loads state, runs the
// pure subsystems (matrix, progression, resets, prescription), persists the
// results.
// ----------------------------------------------

export function freshProgressionState(exerciseId: string): ProgressionState {
  return {
    exerciseId,
    workingE1rm: null,
    observedE1rms: [],
    failureStreak: 0,
    resetModifiers: [],
    updated_at: Date.now(),
  };
}

const effectiveMatrix = (exercise: Exercise): RpeMatrix =>
  exercise.rpeMatrix ?? DEFAULT_RPE_MATRIX;

/**
 * Cold-start seed for the working e1RM, derived from the first logged session:
 * the heaviest honest set (reps on the matrix grid, RPE supplied) is the best
 * single estimate of current capacity, so take the max implied e1RM rather
 * than an average that easy warm-up sets would drag down.
 */
function seedWorkingE1rm(matrix: RpeMatrix, sets: LoggedSet[]): number | null {
  const candidates = sets.filter(
    (s) =>
      s.actualWeight > 0 &&
      s.actualReps >= 1 &&
      s.actualReps <= QUALIFYING_MAX_REPS &&
      s.actualRpe !== undefined,
  );
  if (!candidates.length) return null;
  const best = Math.max(
    ...candidates.map((s) =>
      impliedE1rm(matrix, s.actualWeight, s.actualReps, s.actualRpe!),
    ),
  );
  return Math.round(best * 10) / 10;
}

/** An active reset modifier as it will shape the upcoming session. */
export interface ResetEffect {
  kind: ResetKind;
  multiplier: number; // effect on its axis this session (≤ 1)
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
  prescription: ExercisePrescription | null; // null without a config
}

export interface MesocyclePosition {
  weekIndex: number; // 0-based
  weekCount: number;
  focus: PeriodizationFocus;
  modifiers: FocusModifiers;
  workoutsThisWeek: number; // plan workouts logged in the current training week
}

export interface WorkoutPreview {
  routineId: string;
  routineName: string;
  mesocycle: MesocyclePosition | null;
  exercises: ExercisePreview[];
}

/**
 * Assembles the full picture behind a routine's upcoming workout: per exercise
 * the base config, engine state (e1RMs, streaks, active reset modifiers) and
 * the resulting prescription, plus where the plan currently sits in its
 * mesocycle. Read-only: previewing never mutates engine state.
 */
export async function previewWorkout(
  routineId: string,
  at: number = Date.now(),
): Promise<WorkoutPreview | null> {
  const routine = await db.routines.get(routineId);
  if (!routine) return null;

  // The mesocycle week comes from the plan this routine belongs to — the
  // active plan wins when a routine is shared across plans.
  const plans = await db.plans.toArray();
  const owners = plans.filter((p) => p.routineIds.includes(routineId));
  const plan = owners.find((p) => p.active) ?? owners[0];
  const week = resolveMesocycleWeek(plan, at);
  const weekIndex = mesocycleWeekIndex(plan, at);

  let mesocycle: MesocyclePosition | null = null;
  if (plan && week && weekIndex !== null) {
    const start = weekStart(plan, at);
    const planRoutineIds = new Set(plan.routineIds);
    const inWeek = await db.workouts
      .where("startTime")
      .between(start, at + 1)
      .toArray();
    mesocycle = {
      weekIndex,
      weekCount: plan.mesocycle!.length,
      focus: week.focus,
      modifiers: FOCUS_MODIFIERS[week.focus],
      workoutsThisWeek: inWeek.filter((w) => planRoutineIds.has(w.routineId))
        .length,
    };
  }

  const exercises: ExercisePreview[] = [];
  for (const routineExercise of routine.exercises) {
    const [exercise, state] = await Promise.all([
      db.exercises.get(routineExercise.exerciseId),
      db.progressionStates.get(routineExercise.exerciseId),
    ]);
    if (!exercise) continue;
    exercises.push({
      exerciseId: routineExercise.exerciseId,
      name: exercise.name,
      config: routineExercise.config,
      workingE1rm: state?.workingE1rm ?? null,
      failureStreak: state?.failureStreak ?? 0,
      currentTargetReps: state?.currentTargetReps,
      resetEffects: (state?.resetModifiers ?? [])
        .filter((m) => !isExpired(m))
        .map((m) => ({
          kind: m.kind,
          multiplier: 1 - effectiveMagnitude(m),
          sessionsRemaining: m.decaySessions - m.sessionsElapsed,
        })),
      // Without a progression config there is no model to prescribe from.
      prescription: routineExercise.config
        ? prescribeExercise({
            exerciseId: routineExercise.exerciseId,
            config: routineExercise.config,
            state,
            matrix: effectiveMatrix(exercise),
            week,
          })
        : null,
    });
  }

  return { routineId, routineName: routine.name, mesocycle, exercises };
}

/**
 * Calculates the prescription for every configured exercise of a routine.
 * Read-only: prescribing a workout never mutates engine state.
 */
export async function prescribeWorkout(
  routineId: string,
  at: number = Date.now(),
): Promise<ExercisePrescription[]> {
  const preview = await previewWorkout(routineId, at);
  return (preview?.exercises ?? [])
    .map((e) => e.prescription)
    .filter((p): p is ExercisePrescription => p !== null);
}

/**
 * Post-session pass, run once when a workout is finished: rolls the matrix /
 * observed-e1RM learning, seeds or advances the working e1RM, updates streaks,
 * and fires resets. Idempotence is the caller's responsibility — run it
 * exactly once per saved workout.
 */
export async function applyWorkoutResults(workout: Workout): Promise<void> {
  const routine = await db.routines.get(workout.routineId);

  await db.transaction("rw", [db.exercises, db.progressionStates], async () => {
    for (const workoutExercise of workout.exercises) {
      const exercise = await db.exercises.get(workoutExercise.exerciseId);
      if (!exercise) continue;

      const sets = [...workoutExercise.sets].sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      if (!sets.length) continue;
      // Duplicate slots of the same movement share the first slot's config.
      const config = routine?.exercises.find(
        (e) => e.exerciseId === workoutExercise.exerciseId,
      )?.config;

      const state =
        (await db.progressionStates.get(workoutExercise.exerciseId)) ??
        freshProgressionState(workoutExercise.exerciseId);

      // The modifiers that shaped this session's prescription are now one
      // session older; tick BEFORE evaluating so a reset fired below starts
      // at full strength for the NEXT session.
      let next: ProgressionState = {
        ...state,
        resetModifiers: tickModifiers(state.resetModifiers),
      };

      let matrix = effectiveMatrix(exercise);
      if (sets.some(isQualifyingSet)) {
        const update = applyMatrixUpdates(matrix, next.observedE1rms, sets);
        matrix = update.matrix;
        next.observedE1rms = update.observedE1rms;
        // Learning is per-exercise by definition, so the first update
        // materializes the inherited global matrix as an exercise override.
        await db.exercises.update(workoutExercise.exerciseId, {
          rpeMatrix: matrix,
        });
      }

      if (next.workingE1rm === null) {
        // First logged session is calibration only: it seeds the working e1RM
        // but is not judged against targets it was never prescribed from.
        next.workingE1rm = seedWorkingE1rm(matrix, sets);
      } else if (config) {
        next = advanceProgression(config, next, sets);
      }

      next.updated_at = Date.now();
      await db.progressionStates.put(next);
    }
  });
}

/** Logged sets of a workout merged across duplicate slots of the same movement. */
function setsByExerciseId(workout: Workout): Map<string, LoggedSet[]> {
  const map = new Map<string, LoggedSet[]>();
  for (const we of workout.exercises) {
    const list = map.get(we.exerciseId) ?? [];
    list.push(...we.sets);
    map.set(we.exerciseId, list);
  }
  return map;
}

/**
 * Recalibration proposals for a finished session: per exercise, compares the
 * working e1RM the session was prescribed from against the peak e1RM the
 * session actually demonstrated, proposing a correction when they diverge
 * beyond tolerance. Read-only — proposals are surfaced for user confirmation
 * (applyRecalibrations) rather than applied here.
 *
 * MUST run BEFORE applyWorkoutResults so it reads the PRE-session working e1RM
 * and the pre-learning matrix (mirroring how the summary is built). Exercises
 * still on their cold-start seed (no working e1RM yet) yield no proposal.
 */
export async function computeRecalibrations(
  workout: Workout,
): Promise<RecalibrationProposal[]> {
  const proposals: RecalibrationProposal[] = [];
  for (const [exerciseId, sets] of setsByExerciseId(workout)) {
    const [exercise, state] = await Promise.all([
      db.exercises.get(exerciseId),
      db.progressionStates.get(exerciseId),
    ]);
    if (!exercise || !state) continue;
    const peak = peakImpliedE1rm(effectiveMatrix(exercise), sets);
    const proposedE1rm = proposeRecalibrationE1rm(
      state.workingE1rm,
      peak?.e1rm ?? null,
    );
    if (proposedE1rm === null) continue;
    proposals.push({
      exerciseId,
      exerciseName: exercise.name,
      currentE1rm: state.workingE1rm!,
      sessionE1rm: peak!.e1rm,
      proposedE1rm,
    });
  }
  return proposals;
}

/**
 * Applies user-confirmed recalibrations: snaps each exercise's working e1RM to
 * the proposed value and clears its failure streak — a re-baselined scalar
 * makes a streak counted against the old baseline meaningless. Matrix learning
 * already ran in applyWorkoutResults; only the planning scalar is rewritten.
 */
export async function applyRecalibrations(
  proposals: RecalibrationProposal[],
): Promise<void> {
  if (!proposals.length) return;
  await db.transaction("rw", db.progressionStates, async () => {
    for (const proposal of proposals) {
      const state = await db.progressionStates.get(proposal.exerciseId);
      if (!state) continue;
      await db.progressionStates.put({
        ...state,
        workingE1rm: proposal.proposedE1rm,
        failureStreak: 0,
        updated_at: Date.now(),
      });
    }
  });
}
