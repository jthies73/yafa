import type { RpeMatrix } from "../db/types";

// Solvers — STUBBED. The e1RM/matrix math behind the manual calculator has been
// removed and will be rewritten later. These return 0 so the calculator UI stays
// inert (but compiling) until then. All weights in kg.

/** Weight (kg) for a given e1RM, rep count, and RPE. */
export function solveWeight(
  _matrix: RpeMatrix,
  _e1rm: number,
  _reps: number,
  _rpe: number,
): number {
  return 0;
}

/** Rep count that best fits the observed total load at the given RPE. */
export function solveReps(
  _matrix: RpeMatrix,
  _e1rm: number,
  _totalWeight: number,
  _rpe: number,
): number {
  return 0;
}

/** RPE that best fits the observed total load at the given rep count. */
export function solveRpe(
  _matrix: RpeMatrix,
  _e1rm: number,
  _totalWeight: number,
  _reps: number,
): number {
  return 0;
}
