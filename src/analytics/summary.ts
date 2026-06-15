import type { Exercise, Set as LoggedSet, Workout } from "../db/types";
import { DEFAULT_RPE_MATRIX } from "../db/rpeMatrix";
import { peakImpliedE1rm } from "../engine/matrix";

// ----------------------------------------------
// Post-workout summary: pure metric + PR computation. Persistence-free (mirrors
// engine/matrix.ts and analytics/compute.ts) so every formula is unit-testable
// without Dexie. The service layer loads history/exercises and hands it here.
// ----------------------------------------------

/** Completed vs planned working-set counts; overshoot flags junk volume. */
export interface SetCounts {
  completed: number;
  planned: number;
  overshoot: boolean; // completed > planned
}

export interface AdherenceResult {
  score: number; // 0..100
  adherentSets: number;
  evaluatedSets: number; // max(planned, completed) — the score denominator
}

export type PrType = "e1rm" | "rep" | "volume";

/** One progression marker earned in the session. */
export interface PrResult {
  exerciseId: string;
  exerciseName: string;
  type: PrType;
  e1rm?: number; // e1rm PR: the new estimated 1RM (kg)
  weight?: number; // load (kg): the rep PR's load, or the e1rm best set's weight
  reps?: number; // rep PR / e1rm best set: reps achieved
  rpe?: number; // e1rm best set: RPE
  volume?: number; // volume PR: session volume load for the movement (kg)
}

export interface WorkoutSummary {
  durationMs: number;
  sets: SetCounts;
  volumeLoad: number; // Σ(actualReps × actualWeight) across working sets (kg)
  adherence: AdherenceResult;
  prs: PrResult[];
}

export interface SummaryInput {
  workout: Workout; // the just-completed session (not yet in history)
  history: Workout[]; // all PRIOR workouts (must exclude the current one)
  exercisesById: Map<string, Exercise>;
  // Planned working sets per exerciseId, summed across duplicate routine slots.
  // Exercises absent from the map (added on the fly) count as 0 planned.
  plannedCounts: Record<string, number>;
}

const EPSILON = 1e-6;

/** All logged sets of one movement, merged across duplicate exercise slots. */
function setsByExercise(workout: Workout): Map<string, LoggedSet[]> {
  const map = new Map<string, LoggedSet[]>();
  for (const we of workout.exercises) {
    const list = map.get(we.exerciseId) ?? [];
    list.push(...we.sets);
    map.set(we.exerciseId, list);
  }
  return map;
}

const sessionVolume = (sets: LoggedSet[]): number =>
  sets.reduce((sum, s) => sum + s.actualReps * s.actualWeight, 0);

/**
 * A set is non-adherent if it is extra (beyond the planned count for its
 * exercise), undershoots target reps, or overshoots target RPE by more than
 * 0.5. Missing RPE/target data can never make a set non-adherent on that axis.
 */
function isAdherent(set: LoggedSet, isExtra: boolean): boolean {
  if (isExtra) return false;
  if (set.actualReps < set.targetReps) return false;
  if (
    set.targetRpe != null &&
    set.actualRpe != null &&
    set.actualRpe > set.targetRpe + 0.5
  )
    return false;
  return true;
}

function computeAdherence(
  current: Map<string, LoggedSet[]>,
  plannedCounts: Record<string, number>,
): AdherenceResult {
  let adherentSets = 0;
  let completed = 0;
  for (const [exerciseId, sets] of current) {
    const planned = plannedCounts[exerciseId] ?? 0;
    // Earliest sets fill the plan; anything past the planned count is extra.
    const ordered = [...sets].sort((a, b) => a.timestamp - b.timestamp);
    ordered.forEach((set, i) => {
      completed += 1;
      if (isAdherent(set, i >= planned)) adherentSets += 1;
    });
  }
  const planned = Object.values(plannedCounts).reduce((a, b) => a + b, 0);
  const evaluatedSets = Math.max(planned, completed);
  return {
    adherentSets,
    evaluatedSets,
    score: evaluatedSets === 0 ? 100 : (adherentSets / evaluatedSets) * 100,
  };
}

/** Peak implied e1RM across a set list, considering only honest near-limit sets. */
const bestE1rm = (exercise: Exercise, sets: LoggedSet[]) =>
  peakImpliedE1rm(exercise.rpeMatrix ?? DEFAULT_RPE_MATRIX, sets);

/** Detects the e1RM, rep and volume PRs a single movement earned this session. */
function exercisePrs(
  exercise: Exercise,
  currentSets: LoggedSet[],
  historySets: LoggedSet[],
): PrResult[] {
  const prs: PrResult[] = [];
  const base = { exerciseId: exercise.id, exerciseName: exercise.name };

  // ── e1RM PR ── peak honest e1RM vs the prior peak.
  const current = bestE1rm(exercise, currentSets);
  if (current) {
    const allTime = bestE1rm(exercise, historySets);
    if (allTime && current.e1rm > allTime.e1rm + EPSILON) {
      prs.push({
        ...base,
        type: "e1rm",
        e1rm: current.e1rm,
        weight: current.set.actualWeight,
        reps: current.set.actualReps,
        rpe: current.set.actualRpe!,
      });
    }
  }

  // ── Rep PR ── most reps at an exact load that has prior history at that load.
  // Report the heaviest such load (the most meaningful strength signal).
  let repPr: PrResult | null = null;
  const currentByWeight = new Map<number, number>();
  for (const s of currentSets) {
    currentByWeight.set(
      s.actualWeight,
      Math.max(currentByWeight.get(s.actualWeight) ?? 0, s.actualReps),
    );
  }
  for (const [weight, reps] of currentByWeight) {
    const priorReps = historySets
      .filter((s) => Math.abs(s.actualWeight - weight) < EPSILON)
      .reduce((max, s) => Math.max(max, s.actualReps), 0);
    if (priorReps > 0 && reps > priorReps) {
      if (!repPr || weight > repPr.weight!) {
        repPr = { ...base, type: "rep", weight, reps };
      }
    }
  }
  if (repPr) prs.push(repPr);

  // ── Volume PR (secondary) ── session volume vs best prior single-session.
  const currentVolume = sessionVolume(currentSets);
  if (currentVolume > 0 && historySets.length) {
    const priorBest = Math.max(
      0,
      ...groupSessionsForExercise(historySets).map(sessionVolume),
    );
    if (priorBest > 0 && currentVolume > priorBest + EPSILON) {
      prs.push({
        ...base,
        type: "volume",
        volume: currentVolume,
      });
    }
  }

  return prs;
}

/**
 * Groups historical sets of one exercise back into per-session buckets so a
 * single-session volume best can be derived. The exerciseId is implicit (the
 * caller already filtered to one movement); sessions are keyed by workoutId.
 */
const SESSION_KEY = Symbol("workoutId");
type KeyedSet = LoggedSet & { [SESSION_KEY]?: string };

function groupSessionsForExercise(sets: KeyedSet[]): LoggedSet[][] {
  const sessions = new Map<string, LoggedSet[]>();
  for (const s of sets) {
    const key = s[SESSION_KEY] ?? s.id; // fall back to per-set if unkeyed
    const list = sessions.get(key) ?? [];
    list.push(s);
    sessions.set(key, list);
  }
  return [...sessions.values()];
}

/** Computes the full post-workout summary from a finished session + history. */
export function computeWorkoutSummary(input: SummaryInput): WorkoutSummary {
  const { workout, history, exercisesById, plannedCounts } = input;

  const current = setsByExercise(workout);
  const allCurrentSets = [...current.values()].flat();

  const durationMs =
    workout.endTime != null ? workout.endTime - workout.startTime : 0;
  const volumeLoad = sessionVolume(allCurrentSets);

  const planned = Object.values(plannedCounts).reduce((a, b) => a + b, 0);
  const completed = allCurrentSets.length;
  const sets: SetCounts = {
    completed,
    planned,
    overshoot: completed > planned,
  };

  const adherence = computeAdherence(current, plannedCounts);

  // Index history sets per exercise, tagging each with its workoutId so the
  // volume PR can reconstruct per-session totals.
  const historyByExercise = new Map<string, KeyedSet[]>();
  for (const w of history) {
    for (const we of w.exercises) {
      const tagged: KeyedSet[] = we.sets.map((s) => ({
        ...s,
        [SESSION_KEY]: w.id,
      }));
      const hist = historyByExercise.get(we.exerciseId) ?? [];
      hist.push(...tagged);
      historyByExercise.set(we.exerciseId, hist);
    }
  }

  const prs: PrResult[] = [];
  for (const [exerciseId, currentSets] of current) {
    const exercise = exercisesById.get(exerciseId);
    if (!exercise || !currentSets.length) continue;
    prs.push(
      ...exercisePrs(
        exercise,
        currentSets,
        historyByExercise.get(exerciseId) ?? [],
      ),
    );
  }

  // Primary markers (e1RM, then rep) lead; volume is secondary.
  const order: Record<PrType, number> = { e1rm: 0, rep: 1, volume: 2 };
  prs.sort((a, b) => order[a.type] - order[b.type]);

  return { durationMs, sets, volumeLoad, adherence, prs };
}
