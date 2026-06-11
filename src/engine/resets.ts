import type { ResetKind, ResetModifier } from "../db/types";
import {
  INTENSITY_RESET_MAGNITUDE,
  INTENSITY_RESET_DECAY_SESSIONS,
  INTENSITY_RESET_E1RM_DROP,
  VOLUME_RESET_MAGNITUDE,
  VOLUME_RESET_DECAY_SESSIONS,
} from "./config";

// ----------------------------------------------
// Reset/modifier subsystem: the decaying corrective layer applied on top of
// prescriptions after a reset. Pure — persistence-free and testable alone.
// ----------------------------------------------

/** Current strength of a modifier: linear taper from full to zero. */
export function effectiveMagnitude(modifier: ResetModifier): number {
  const remaining = 1 - modifier.sessionsElapsed / modifier.decaySessions;
  return Math.max(0, modifier.initialMagnitude * remaining);
}

export function isExpired(modifier: ResetModifier): boolean {
  return modifier.sessionsElapsed >= modifier.decaySessions;
}

/**
 * Combined multiplier (≤ 1) the active modifiers of `kind` apply to a target.
 * Stacked resets multiply rather than add so the result can never go negative.
 */
export function resetMultiplier(
  modifiers: ResetModifier[],
  kind: ResetKind,
): number {
  return modifiers
    .filter((m) => m.kind === kind && !isExpired(m))
    .reduce((multiplier, m) => multiplier * (1 - effectiveMagnitude(m)), 1);
}

/**
 * Advance the queue by one completed session and drop spent modifiers.
 * Called post-session, AFTER the session consumed the current magnitudes —
 * so a freshly created modifier applies at full strength to the next session.
 */
export function tickModifiers(modifiers: ResetModifier[]): ResetModifier[] {
  return modifiers
    .map((m) => ({ ...m, sessionsElapsed: m.sessionsElapsed + 1 }))
    .filter((m) => !isExpired(m));
}

export function createIntensityResetModifier(): ResetModifier {
  return {
    kind: "intensity",
    initialMagnitude: INTENSITY_RESET_MAGNITUDE,
    decaySessions: INTENSITY_RESET_DECAY_SESSIONS,
    sessionsElapsed: 0,
  };
}

export function createVolumeResetModifier(): ResetModifier {
  return {
    kind: "volume",
    initialMagnitude: VOLUME_RESET_MAGNITUDE,
    decaySessions: VOLUME_RESET_DECAY_SESSIONS,
    sessionsElapsed: 0,
  };
}

/**
 * The LASTING working-e1RM cut of an intensity reset. This cut — not the
 * decaying modifier — is what prevents reset oscillation on a true plateau:
 * without it, the modifier would expire and prescriptions would return to the
 * exact loads that caused the failures, immediately re-triggering the reset.
 * The decaying modifier created alongside it only smooths the re-entry.
 *
 * When an observed e1RM exists we re-baseline to demonstrated recent capacity,
 * but never above the flat cut — a reset must not make prescriptions heavier.
 */
export function intensityResetE1rm(
  workingE1rm: number,
  observed: number | null,
): number {
  const cut = workingE1rm * (1 - INTENSITY_RESET_E1RM_DROP);
  return observed === null ? cut : Math.min(cut, observed);
}
