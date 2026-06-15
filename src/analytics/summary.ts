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
  score: number; // 0..100, session-level (pooled across prescribed sets)
  prescribedSets: number; // the score denominator: total prescribed sets
  extraSets: number; // sets logged beyond prescription (each −EXTRA_SET_PENALTY)
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

// Adherence penalties (points). The RPE cap is the binding constraint, so RPE
// overshoot costs the most; a rep shortfall is graded and milder; rogue volume
// (extra sets) docks the pooled score because it disrupts fatigue management.
const RPE_PENALTY_PER_POINT = 15; // per 1.0 RPE over the cap
const REP_PENALTY_PER_REP = 5; // per rep short, when effort was left in reserve
const EXTRA_SET_PENALTY = 10; // per set beyond the prescription

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
 * 0–100 adherence score for one completed set. Effort-aware: the RPE cap is the
 * binding constraint, so only RPE OVERSHOOT is penalized — a set that is easier
 * than prescribed (including the lighter loads the engine prescribes after a
 * failure) is never punished. A rep shortfall is excused when the lifter reached
 * the RPE cap (load/fatigue explains it, e.g. autoregulation or a true failure);
 * it counts only when effort was left in reserve. Missing RPE → reps only.
 */
function setScore(set: LoggedSet): number {
  const hasRpe = set.targetRpe != null && set.actualRpe != null;
  const rpePenalty = hasRpe
    ? Math.max(0, set.actualRpe! - set.targetRpe!) * RPE_PENALTY_PER_POINT
    : 0;
  const capReached = hasRpe && set.actualRpe! >= set.targetRpe!;
  const repShort = Math.max(0, set.targetReps - set.actualReps);
  const repPenalty = capReached ? 0 : repShort * REP_PENALTY_PER_REP;
  return Math.max(0, 100 - rpePenalty - repPenalty);
}

/**
 * Session adherence, pooled across every prescribed set. For each exercise the
 * earliest `planned` completed sets are scored; sets beyond that are extra (junk
 * volume); prescribed-but-unlogged sets contribute 0 implicitly because the
 * denominator is the total prescribed count — which includes fully-skipped
 * exercises that never appear in `current`. Each extra set then docks the pooled
 * score by EXTRA_SET_PENALTY. With nothing prescribed there is nothing to
 * deviate from, so the session scores 100.
 */
function computeAdherence(
  current: Map<string, LoggedSet[]>,
  plannedCounts: Record<string, number>,
): AdherenceResult {
  const prescribedSets = Object.values(plannedCounts).reduce(
    (a, b) => a + b,
    0,
  );

  let scoreSum = 0;
  let extraSets = 0;
  for (const [exerciseId, sets] of current) {
    const planned = plannedCounts[exerciseId] ?? 0;
    // Earliest sets fill the plan; anything past the planned count is extra.
    const ordered = [...sets].sort((a, b) => a.timestamp - b.timestamp);
    ordered.forEach((set, i) => {
      if (i < planned) scoreSum += setScore(set);
      else extraSets += 1;
    });
  }

  if (prescribedSets === 0) return { score: 100, prescribedSets: 0, extraSets };

  const base = scoreSum / prescribedSets;
  const score = Math.max(0, base - extraSets * EXTRA_SET_PENALTY);
  return { score, prescribedSets, extraSets };
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
