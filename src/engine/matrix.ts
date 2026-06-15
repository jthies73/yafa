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
 * Whether a logged set lands naturally on a matrix cell (no clamping): a real
 * RPE within the grid's RPE span, reps within the grid's rep span, and load on
 * the bar. Every such set calibrates its cell's shape. The raw RPE must be in
 * range so a genuine RPE 5.8 stays out of the grid rather than snapping up onto
 * the RPE-6 column.
 */
export function isInGridSet(set: LoggedSet): boolean {
  return (
    set.actualRpe !== undefined &&
    set.actualRpe >= RPE_MIN &&
    set.actualRpe <= RPE_MAX &&
    set.actualReps >= LOOKUP_REPS_MIN &&
    set.actualReps <= LOOKUP_REPS_MAX &&
    set.actualWeight > 0
  );
}

/**
 * Whether a set is an honest, near-limit set trusted to move the observed e1RM
 * (a strict subset of in-grid sets). Applies to every set — top set or back-off
 * alike.
 */
export function isQualifyingSet(set: LoggedSet): boolean {
  return (
    (set.actualRpe ?? 0) >= QUALIFYING_MIN_RPE &&
    set.actualReps >= 1 &&
    set.actualReps <= QUALIFYING_MAX_REPS &&
    set.actualWeight > 0
  );
}

export interface PeakE1rm {
  e1rm: number;
  set: LoggedSet;
}

/**
 * Peak implied e1RM across a set list, considering only honest near-limit
 * (qualifying) sets — the single number that best represents the capacity a
 * session demonstrated. null when no set qualifies.
 */
export function peakImpliedE1rm(
  matrix: RpeMatrix,
  sets: LoggedSet[],
): PeakE1rm | null {
  let best: PeakE1rm | null = null;
  for (const set of sets) {
    if (!isQualifyingSet(set)) continue;
    const e1rm = impliedE1rm(
      matrix,
      set.actualWeight,
      set.actualReps,
      set.actualRpe!,
    );
    if (!best || e1rm > best.e1rm) best = { e1rm, set };
  }
  return best;
}

export interface MatrixUpdateResult {
  matrix: RpeMatrix;
  observedE1rms: number[];
  /** True iff at least one cell was nudged (lets the caller skip a no-op write). */
  changed: boolean;
}

const cloneMatrix = (matrix: RpeMatrix): RpeMatrix => {
  const out: RpeMatrix = {};
  for (const reps of Object.keys(matrix)) {
    out[Number(reps)] = { ...matrix[Number(reps)] };
  }
  return out;
};

/** Bleed a kernel-weighted fraction of a cell's delta into its ±1.0 RPE row neighbors. */
const smoothNeighbors = (
  matrix: RpeMatrix,
  reps: number,
  rpe: number,
  delta: number,
): void => {
  for (const { offset, factor } of MATRIX_SMOOTHING_KERNEL) {
    for (const direction of [-1, 1]) {
      const neighborRpe = rpe + direction * offset;
      if (neighborRpe >= RPE_MIN && neighborRpe <= RPE_MAX) {
        matrix[reps][neighborRpe] += delta * factor;
      }
    }
  }
};

/**
 * Direct (user-edit) cell write with the same neighbor smoothing the
 * post-session learning applies: the edited cell takes exactly the given
 * value, and the cells within ±1.0 RPE absorb a kernel-weighted fraction of
 * the change — so a manual edit bends the curve locally instead of leaving a
 * step in it. Pure: returns a fresh matrix.
 */
export function setMatrixCell(
  matrix: RpeMatrix,
  reps: number,
  rpe: number,
  value: number,
): RpeMatrix {
  const next = cloneMatrix(matrix);
  const row = clampLookupReps(reps);
  const col = snapRpe(rpe);
  const delta = value - next[row][col];
  next[row][col] = value;
  smoothNeighbors(next, row, col, delta);
  return next;
}

/**
 * Post-session matrix learning. For each in-grid set, in lift order, EMA-nudge
 * the touched cell toward the percentage the set demonstrated relative to a
 * baseline e1RM, then bleed a fraction of that nudge into the cells within
 * ±1.0 RPE (see MATRIX_SMOOTHING_KERNEL for the kernel rationale). The baseline
 * differs by set:
 *
 * - Qualifying (honest, near-limit) sets roll their implied e1RM into the
 *   observed window first and nudge against the window mean — they calibrate
 *   both the matrix AND the observed e1RM.
 * - Off-anchor sets (in-grid but sub-qualifying RPE) leave the observed window
 *   untouched and nudge against the fixed working e1RM: too far from limit to
 *   estimate capacity, but a fine probe of the curve's SHAPE given a known
 *   e1RM. With no working e1RM yet (cold start) there is no baseline, so they
 *   are skipped.
 *
 * Pure: returns fresh copies, never mutates its inputs.
 */
export function applyMatrixUpdates(
  matrix: RpeMatrix,
  observedE1rms: number[],
  sets: LoggedSet[],
  workingE1rm: number | null,
): MatrixUpdateResult {
  const next = cloneMatrix(matrix);
  const observed = [...observedE1rms];
  let changed = false;

  const inGrid = [...sets]
    .filter(isInGridSet)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const set of inGrid) {
    const reps = clampLookupReps(set.actualReps);
    const rpe = snapRpe(set.actualRpe!);

    let baseline: number;
    if (isQualifyingSet(set)) {
      observed.push(set.actualWeight / next[reps][rpe]);
      if (observed.length > OBSERVED_E1RM_WINDOW) {
        observed.splice(0, observed.length - OBSERVED_E1RM_WINDOW);
      }
      baseline = observedE1rm(observed)!;
    } else {
      if (workingE1rm === null) continue;
      baseline = workingE1rm;
    }

    const observedPct = set.actualWeight / baseline;
    const delta = MATRIX_EMA_ALPHA * (observedPct - next[reps][rpe]);
    next[reps][rpe] += delta;
    smoothNeighbors(next, reps, rpe, delta);
    changed = true;
  }

  return { matrix: next, observedE1rms: observed, changed };
}
