import type { RpeMatrix, Set as LoggedSet } from "../db/types";

// ----------------------------------------------
// RPE matrix + e1RM math — STUBBED. The lookup/derivation/learning logic has
// been removed and will be rewritten later. The exported surface is kept so
// analytics, the manual calculator, and the RPE-matrix editor still compile;
// every function is inert (finite, no-op) for now.
// ----------------------------------------------

/** Snap an RPE to the 0.5 grid (identity passthrough while stubbed). */
export function snapRpe(rpe: number): number {
  return rpe;
}

/** Clamp a rep count to the matrix rows (identity passthrough while stubbed). */
export function clampLookupReps(reps: number): number {
  return reps;
}

/** Percentage of e1RM at (reps, rpe). Stubbed to 1 (keeps derived values finite). */
export function matrixPct(
  _matrix: RpeMatrix,
  _reps: number,
  _rpe: number,
): number {
  return 1;
}

/** The e1RM a set implies. Stubbed to 0. */
export function impliedE1rm(
  _matrix: RpeMatrix,
  _weight: number,
  _reps: number,
  _rpe: number,
): number {
  return 0;
}

/** Matrix-derived weight for an e1RM at (reps, rpe). Stubbed to 0. */
export function weightFromE1rm(
  _matrix: RpeMatrix,
  _e1rm: number,
  _reps: number,
  _rpe: number,
): number {
  return 0;
}

/** Round a weight to what can be loaded (identity passthrough while stubbed). */
export function roundToLoadable(weight: number, _increment?: number): number {
  return weight;
}

/** Whether a set is honest/near-limit. Stubbed to false. */
export function isQualifyingSet(_set: LoggedSet): boolean {
  return false;
}

export interface PeakE1rm {
  e1rm: number;
  set: LoggedSet;
}

/** Peak implied e1RM across a set list. Stubbed to null (no qualifying sets). */
export function peakImpliedE1rm(
  _matrix: RpeMatrix,
  _sets: LoggedSet[],
): PeakE1rm | null {
  return null;
}

/** Direct cell edit. Stubbed to return the matrix unchanged. */
export function setMatrixCell(
  matrix: RpeMatrix,
  _reps: number,
  _rpe: number,
  _value: number,
): RpeMatrix {
  return matrix;
}
