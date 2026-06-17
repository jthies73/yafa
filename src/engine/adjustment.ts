import type { RpeMatrix } from "../db/types";

// ----------------------------------------------
// In-session prescription adjustment — STUBBED. The re-prescription logic (re-
// anchoring the next set's target to the demonstrated e1RM) has been removed and
// will be rewritten later. The tracker still calls this; it just never offers a
// proposal for now.
// ----------------------------------------------

export interface SetAdjustment {
  reps: number;
  weight: number;
  rpe: number | null;
}

export function proposeSetAdjustment(
  _matrix: RpeMatrix,
  _prev: { weight: number; reps: number; rpe: number },
  _target: { reps: number; rpe: number | null; weight: number | null },
): SetAdjustment | null {
  return null;
}
