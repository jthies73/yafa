import type { PeriodizationFocus } from "../db/types";

// ----------------------------------------------
// Engine tuning constants — the single source of every magic number the
// progression engine relies on. Pure data; no logic. Kept in one place so the
// locked domain rules (which are NOT tunable) stay visually separate from the
// heuristics (which are).
//
// Pipeline stage: cross-cutting — every stage (prescription, evaluation, state,
// mesocycle) reads from here.
// ----------------------------------------------

// --- Locked domain rules (decided by the user; do NOT tune casually) ---

/** Default RPE the prescribed load aims for AND the rules judge against. */
export const DEFAULT_TARGET_RPE = 8;
/** Default ceiling — only caps the rendered load, never judges. */
export const DEFAULT_RPE_CEILING = 9;
/** Consecutive regressions that arm a reset. The 3rd regression sets the flag. */
export const REGRESSION_RESET_TRIGGER = 3;
/** Fraction the c1RM drops when a reset is consumed (−10%). */
export const RESET_DROP = 0.1;

// --- Calibration / matrix mechanics ---

/**
 * Granularity prescribed weights round to. Fine (0.1 kg) so the rendered target is
 * a precise number rather than snapped to a plate pair — the user sees the exact
 * intended load and decides how to make it on their equipment. The coarser
 * PRESCRIBED_WEIGHT_TOLERANCE_KG band below is what absorbs real-world plate
 * rounding when judging whether a logged set hit the prescription.
 */
export const LOADABLE_INCREMENT_KG = 0.1;
/**
 * Tolerance band for the "weight == prescribed" clause in the regression rules and
 * the trivial-diff filter on in-session proposals. A logged set within ±2.5 kg of
 * the prescribed weight counts as "at" it, so plate-rounding noise never hides a
 * genuine regression nor surfaces a pointless re-prescription.
 */
export const PRESCRIBED_WEIGHT_TOLERANCE_KG = 2.5;

/**
 * A set only implies a usable e1RM when it is honest and near-limit: RPE ≥ 8 and
 * reps ≤ 10. These gate both analytics' e1RM chart and the cold-start c1RM seed,
 * so they live here as the shared definition.
 */
export const QUALIFYING_MIN_RPE = 8;
export const QUALIFYING_MAX_REPS = 10;

// --- c1RM reconciliation (HEURISTIC — explicitly tunable) ---
//
// The deterministic step (success/hold/regression) is the PRIMARY driver of the
// c1RM. Reconciliation is a slow corrective overlay: it smooths the calculated
// e1RM (a robust EWMA with an outlier clamp) and, only when that estimate has
// drifted from the c1RM beyond a deadband, nudges the c1RM a fraction of the way
// toward it. This deliberately relaxes the "e1RM never feeds c1RM" rule — here
// e1RM is a slow bias on the anchor, never a replacement for it. A scalar Kalman
// filter degenerates to exactly this EWMA at steady state, without the per-anchor
// covariance state (and Dexie schema) it would cost; this is that, made explicit.
export const E1RM_EWMA_ALPHA = 0.25; // smoothing: weight given to each new e1RM
export const E1RM_OUTLIER_BAND = 0.2; // clip one observation's pull to ±20% of est
export const RECONCILE_DEADBAND = 0.05; // ignore drift within ±5% of the c1RM
export const RECONCILE_NUDGE_FRACTION = 0.25; // close 25% of the gap per reconcile

// --- RPE matrix grid bounds (mirror src/db/rpeMatrix.ts) ---

export const MATRIX_MIN_REPS = 1;
export const MATRIX_MAX_REPS = 10;
export const MATRIX_MIN_RPE = 6;
export const MATRIX_MAX_RPE = 10;
/** RPE columns are spaced every 0.5; snapRpe rounds to this grid. */
export const RPE_STEP = 0.5;

// --- Mesocycle modifiers (HEURISTIC — explicitly tunable) ---
//
// These shift an exercise's TARGETS per week focus; the load always re-renders
// from the shifted targets (there is no direct load multiplier). They sketch the
// canonical curve FOCUS_META draws: volume tapers and intensity climbs toward a
// peak, then a deload backs off both. They are a defensible first pass, NOT a
// locked domain rule — validate against real logs and adjust freely.

/** RPE added to the (top-set) targetRpe — intensity. */
export const MESO_RPE_DELTA: Record<PeriodizationFocus, number> = {
  hypertrophy: 0,
  strength: 0.5,
  peaking: 1,
  deload: -1.5,
};

/** Reps added to the rep target — negative trims reps as intensity rises. */
export const MESO_REP_DELTA: Record<PeriodizationFocus, number> = {
  hypertrophy: 1,
  strength: -1,
  peaking: -2,
  deload: 0,
};

/** Working sets added — volume. */
export const MESO_SET_DELTA: Record<PeriodizationFocus, number> = {
  hypertrophy: 1,
  strength: 0,
  peaking: -1,
  deload: -1,
};
