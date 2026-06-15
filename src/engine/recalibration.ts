import {
  RECALIBRATION_BLEND,
  RECALIBRATION_DIVERGENCE_THRESHOLD,
} from "./config";

// ----------------------------------------------
// Recalibration subsystem: when a session demonstrates an e1RM that has drifted
// far from the working e1RM, the planning scalar is stale and should be snapped
// back toward reality. Pure — the service layer supplies the working e1RM and
// the session's peak demonstrated e1RM, and persists/confirms the result.
// ----------------------------------------------

/** One exercise's proposed working-e1RM recalibration, pending user confirmation. */
export interface RecalibrationProposal {
  exerciseId: string;
  exerciseName: string;
  currentE1rm: number; // working e1RM the session was prescribed from
  sessionE1rm: number; // peak honest e1RM the session demonstrated
  proposedE1rm: number; // where a confirmed recalibration moves the working e1RM
}

/**
 * The recalibration target for an exercise, or null when none is warranted.
 * Returns null when there is no working e1RM yet (the first session seeds it
 * instead) or when the session's demonstrated e1RM is within tolerance of the
 * working e1RM. Otherwise — divergence ≥ threshold in either direction — the
 * working e1RM is moved RECALIBRATION_BLEND of the way toward the demonstrated
 * value, rounded to 0.1 kg.
 */
export function proposeRecalibrationE1rm(
  currentE1rm: number | null,
  sessionPeakE1rm: number | null,
): number | null {
  if (currentE1rm === null || currentE1rm <= 0 || sessionPeakE1rm === null) {
    return null;
  }
  const divergence = sessionPeakE1rm / currentE1rm - 1;
  if (Math.abs(divergence) < RECALIBRATION_DIVERGENCE_THRESHOLD) return null;
  const proposed =
    currentE1rm + RECALIBRATION_BLEND * (sessionPeakE1rm - currentE1rm);
  return Math.round(proposed * 10) / 10;
}
