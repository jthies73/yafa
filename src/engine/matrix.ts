import type { RpeMatrix, Set as LoggedSet } from "../db/types";
import {
  RPE_MIN,
  RPE_MAX,
  LOOKUP_REPS_MIN,
  LOOKUP_REPS_MAX,
  QUALIFYING_MIN_RPE,
  QUALIFYING_MAX_REPS,
  OBSERVED_E1RM_WINDOW,
  MATRIX_EMA_ALPHA,
  MATRIX_SMOOTHING_KERNEL,
  LOADABLE_INCREMENT_KG,
} from "./config";

// ----------------------------------------------
// RPE matrix + e1RM subsystem: pure lookup, derivation, and learning logic.
// Persistence-free so it can be tested in isolation.
// ----------------------------------------------

/** Clamp an RPE into the matrix grid and snap it to the 0.5 step. */
export function snapRpe(rpe: number): number {
  const clamped = Math.min(RPE_MAX, Math.max(RPE_MIN, rpe));
  return Math.round(clamped * 2) / 2;
}

/** Clamp a rep count to the rows the matrix actually has (1–10). */
export function clampLookupReps(reps: number): number {
  return Math.min(LOOKUP_REPS_MAX, Math.max(LOOKUP_REPS_MIN, Math.round(reps)));
}

/** Percentage of e1RM the matrix assigns to (reps, rpe), grid-clamped. */
export function matrixPct(
  matrix: RpeMatrix,
  reps: number,
  rpe: number,
): number {
  return matrix[clampLookupReps(reps)][snapRpe(rpe)];
}

/** The e1RM a set implies, given the matrix's current calibration. */
export function impliedE1rm(
  matrix: RpeMatrix,
  weight: number,
  reps: number,
  rpe: number,
): number {
  return weight / matrixPct(matrix, reps, rpe);
}

/** Matrix-derived weight for an e1RM at (reps, rpe), rounded to 0.1. */
export function weightFromE1rm(
  matrix: RpeMatrix,
  e1rm: number,
  reps: number,
  rpe: number,
): number {
  return Math.round(e1rm * matrixPct(matrix, reps, rpe) * 10) / 10;
}

/** Round a weight to what can physically be put on the bar. */
export function roundToLoadable(
  weight: number,
  increment: number = LOADABLE_INCREMENT_KG,
): number {
  return Math.round(weight / increment) * increment;
}

/** Mean of the rolling implied-e1RM window; null while the window is empty. */
export function observedE1rm(observedE1rms: number[]): number | null {
  if (!observedE1rms.length) return null;
  return observedE1rms.reduce((sum, v) => sum + v, 0) / observedE1rms.length;
}

/**
 * Whether a logged set is allowed to feed the matrix/observed-e1RM update.
 * Applies to every set — top set or back-off alike.
 */
export function isQualifyingSet(set: LoggedSet): boolean {
  return (
    (set.actualRpe ?? 0) >= QUALIFYING_MIN_RPE &&
    set.actualReps >= 1 &&
    set.actualReps <= QUALIFYING_MAX_REPS &&
    set.actualWeight > 0
  );
}

export interface MatrixUpdateResult {
  matrix: RpeMatrix;
  observedE1rms: number[];
}

const cloneMatrix = (matrix: RpeMatrix): RpeMatrix => {
  const out: RpeMatrix = {};
  for (const reps of Object.keys(matrix)) {
    out[Number(reps)] = { ...matrix[Number(reps)] };
  }
  return out;
};

/**
 * Post-session matrix learning. For each qualifying set, in lift order:
 * 1. roll its implied e1RM into the observed window,
 * 2. EMA-nudge the touched cell toward the percentage the set actually
 *    demonstrated relative to the observed e1RM,
 * 3. bleed a fraction of that nudge into the cells within ±1.0 RPE
 *    (see MATRIX_SMOOTHING_KERNEL for the kernel rationale).
 *
 * Pure: returns fresh copies, never mutates its inputs.
 */
export function applyMatrixUpdates(
  matrix: RpeMatrix,
  observedE1rms: number[],
  sets: LoggedSet[],
): MatrixUpdateResult {
  const next = cloneMatrix(matrix);
  const observed = [...observedE1rms];

  const qualifying = [...sets]
    .filter(isQualifyingSet)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const set of qualifying) {
    const reps = clampLookupReps(set.actualReps);
    const rpe = snapRpe(set.actualRpe!);

    observed.push(set.actualWeight / next[reps][rpe]);
    if (observed.length > OBSERVED_E1RM_WINDOW) {
      observed.splice(0, observed.length - OBSERVED_E1RM_WINDOW);
    }
    const obs = observedE1rm(observed)!;

    const observedPct = set.actualWeight / obs;
    const delta = MATRIX_EMA_ALPHA * (observedPct - next[reps][rpe]);
    next[reps][rpe] += delta;

    for (const { offset, factor } of MATRIX_SMOOTHING_KERNEL) {
      for (const direction of [-1, 1]) {
        const neighborRpe = rpe + direction * offset;
        if (neighborRpe >= RPE_MIN && neighborRpe <= RPE_MAX) {
          next[reps][neighborRpe] += delta * factor;
        }
      }
    }
  }

  return { matrix: next, observedE1rms: observed };
}
