import type { RpeMatrix } from "../db/types";
import { DEFAULT_TARGET_RPE, LOOKUP_REPS_MIN, LOOKUP_REPS_MAX } from "./config";
import {
  impliedE1rm,
  matrixPct,
  roundToLoadable,
  weightFromE1rm,
} from "./matrix";

// ----------------------------------------------
// In-session prescription adjustment: when a logged set deviates from its
// prescription, the lifter's capacity that day differs from what the plan
// assumed. Re-anchor to the demonstrated e1RM and propose the next set's target
// (load + reps) at the prescribed RPE. Pure — the tracker wires it to live data.
// ----------------------------------------------

export interface SetAdjustment {
  reps: number;
  weight: number;
  rpe: number | null; // preserves the target's RPE (null for load-prescribed back-offs)
}

/** The matrix rep count whose percentage best matches `weight / e1rm` at `rpe`. */
function repsForLoad(
  matrix: RpeMatrix,
  e1rm: number,
  weight: number,
  rpe: number,
): number {
  const targetPct = weight / e1rm;
  let best = LOOKUP_REPS_MIN;
  let bestErr = Infinity;
  for (let r = LOOKUP_REPS_MIN; r <= LOOKUP_REPS_MAX; r++) {
    const err = Math.abs(matrixPct(matrix, r, rpe) - targetPct);
    if (err < bestErr) {
      bestErr = err;
      best = r;
    }
  }
  return best;
}

/**
 * Proposed next-set target derived from the previous set's actual outcome.
 * Holds the prescribed RPE, re-anchors to the implied e1RM, and returns a
 * loadable weight plus the integer rep count that pairs with it at that RPE — so
 * a heavier (rounded-up) load reads as ≤ the target reps and a lighter one as ≥.
 *
 * Back-off targets (`rpe == null`) are load-prescribed: they keep their reps and
 * only re-load (RPE 8 is used for the math but never imposed). Returns null when
 * the result matches the current target — there is no change worth offering.
 */
export function proposeSetAdjustment(
  matrix: RpeMatrix,
  prev: { weight: number; reps: number; rpe: number },
  target: { reps: number; rpe: number | null; weight: number | null },
): SetAdjustment | null {
  const e1rm = impliedE1rm(matrix, prev.weight, prev.reps, prev.rpe);
  if (!Number.isFinite(e1rm) || e1rm <= 0) return null;

  const rpe = target.rpe ?? DEFAULT_TARGET_RPE;
  const weight = roundToLoadable(
    weightFromE1rm(matrix, e1rm, target.reps, rpe),
  );
  if (!Number.isFinite(weight) || weight <= 0) return null;

  const reps =
    target.rpe == null ? target.reps : repsForLoad(matrix, e1rm, weight, rpe);

  if (weight === target.weight && reps === target.reps) return null;
  return { reps, weight, rpe: target.rpe };
}
