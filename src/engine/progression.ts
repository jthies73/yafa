import type {
  DoubleProgressionParams,
  LinearProgressionParams,
  ProgressionState,
  RoutineExerciseConfig,
  Set as LoggedSet,
  TopSetProgressionParams,
} from "../db/types";
import {
  DEFAULT_TARGET_RPE,
  DOUBLE_PLATEAU_RESET_TRIGGER,
  DOUBLE_REGRESSION_RESET_TRIGGER,
  LP_FAILURE_RESET_TRIGGER,
  TOP_SET_FAILURE_RESET_TRIGGER,
} from "./config";
import { observedE1rm } from "./matrix";
import {
  createIntensityResetModifier,
  createVolumeResetModifier,
  intensityResetE1rm,
} from "./resets";

// ----------------------------------------------
// Progression models: session evaluation and state transitions. Pure — the
// service layer feeds logged sets in and persists the returned state.
// ----------------------------------------------

export type SessionOutcome = "progress" | "hold" | "failure";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Linear progression three-way outcome, evaluated across all sets: the worst
 * set decides (any short set ⇒ reps not met; the hardest set's RPE is the
 * session's RPE cost).
 */
export function evaluateLinear(
  params: LinearProgressionParams,
  sets: LoggedSet[],
): SessionOutcome {
  if (!sets.length) return "hold";

  // Sessions are judged against the same RPE their weights were derived from,
  // so configs without an explicit targetRpe fall back to the engine default.
  const targetRpe = params.targetRpe ?? DEFAULT_TARGET_RPE;

  const anyRepsShort = sets.some((s) => s.actualReps < params.targetReps);
  const rpes = sets
    .map((s) => s.actualRpe)
    .filter((rpe): rpe is number => rpe !== undefined);
  const maxRpe = rpes.length ? Math.max(...rpes) : null;

  if (anyRepsShort || (maxRpe !== null && maxRpe - 1 > targetRpe)) {
    return "failure";
  }
  if (maxRpe === null || maxRpe <= targetRpe) return "progress";
  // Reps met but RPE within one point over target: the grey zone.
  return "hold";
}

export interface TopSetEvaluation {
  progressed: boolean;
  flagged: boolean;
}

/**
 * Top set + back-off: only the TOP SET drives progression and fatigue — the
 * prescription emits it first and the tracker preserves set order, so it is
 * the first logged set. Back-off sets are never evaluated here (they only
 * feed the matrix update when they qualify).
 */
export function evaluateTopSet(
  params: TopSetProgressionParams,
  sets: LoggedSet[],
): TopSetEvaluation {
  const top = sets[0];
  if (!top) return { progressed: false, flagged: false };

  // A missing RPE is read as exactly on-target: neither proof of headroom nor
  // of overshoot.
  const rpe = top.actualRpe ?? params.topSetTargetRpe;
  const repsMet = top.actualReps >= params.topSetTargetReps;

  return {
    progressed: repsMet && rpe <= params.topSetTargetRpe,
    flagged:
      // Target failure: missed the reps AND paid more than the target RPE.
      (!repsMet && rpe > params.topSetTargetRpe) ||
      // Systemic cost: hit or missed, the session ran >1 RPE over target.
      rpe - 1 > params.topSetTargetRpe,
  };
}

export interface DoubleEvaluation {
  progressed: boolean;
  nextTargetReps: number;
  /** Total reps vs the previous session at the same weight. */
  comparison: "regression" | "plateau" | "improvement" | "incomparable";
  totalReps: number;
  sessionWeight: number | undefined;
}

export function evaluateDouble(
  params: DoubleProgressionParams,
  state: ProgressionState,
  sets: LoggedSet[],
): DoubleEvaluation {
  const totalReps = sets.reduce((sum, s) => sum + s.actualReps, 0);
  // All sets in double progression share one working weight, so the first
  // set's load stands in for the session's.
  const sessionWeight = sets[0]?.actualWeight;

  const current = state.currentTargetReps ?? params.minReps;
  if (!sets.length) {
    return {
      progressed: false,
      nextTargetReps: current,
      comparison: "incomparable",
      totalReps: 0,
      sessionWeight: undefined,
    };
  }

  const progressed = sets.every((s) => s.actualReps >= params.maxReps);
  const worstSetReps = Math.min(...sets.map((s) => s.actualReps));
  // The next rep goal advances toward maxReps anchored to the worst set
  // (weakest-set + 1), but never moves backwards — a bad day lowers nothing.
  const nextTargetReps = progressed
    ? params.minReps
    : clamp(
        Math.max(current, worstSetReps + 1),
        params.minReps,
        params.maxReps,
      );

  // Regression/plateau only mean something at the same load; a weight change
  // resets the comparison baseline.
  let comparison: DoubleEvaluation["comparison"] = "incomparable";
  if (
    state.lastSessionReps !== undefined &&
    state.lastSessionWeight !== undefined &&
    sessionWeight !== undefined &&
    Math.abs(sessionWeight - state.lastSessionWeight) < 1e-9
  ) {
    if (totalReps < state.lastSessionReps) comparison = "regression";
    else if (totalReps === state.lastSessionReps) comparison = "plateau";
    else comparison = "improvement";
  }

  return { progressed, nextTargetReps, comparison, totalReps, sessionWeight };
}

const applyIntensityReset = (state: ProgressionState): void => {
  if (state.workingE1rm !== null) {
    state.workingE1rm = intensityResetE1rm(
      state.workingE1rm,
      observedE1rm(state.observedE1rms),
    );
  }
  state.resetModifiers = [
    ...state.resetModifiers,
    createIntensityResetModifier(),
  ];
  state.failureStreak = 0;
};

const applyVolumeReset = (state: ProgressionState): void => {
  // Volume reset deliberately leaves workingE1rm (and therefore weight)
  // untouched — the lifter keeps the load and rebuilds the rep volume.
  state.resetModifiers = [...state.resetModifiers, createVolumeResetModifier()];
  state.regressionStreak = 0;
  state.plateauStreak = 0;
};

/**
 * Post-session state transition for an exercise: applies the model's outcome
 * (e1RM increment, streak bookkeeping) and fires a reset when a streak hits
 * its trigger. Pure — returns a new state object.
 */
export function advanceProgression(
  config: RoutineExerciseConfig,
  state: ProgressionState,
  sets: LoggedSet[],
): ProgressionState {
  const next: ProgressionState = {
    ...state,
    resetModifiers: [...state.resetModifiers],
  };
  if (!sets.length) return next;

  switch (config.progressionModel) {
    case "linear": {
      const params = config.progressionParams as LinearProgressionParams;
      const outcome = evaluateLinear(params, sets);
      if (outcome === "progress") {
        next.workingE1rm = (next.workingE1rm ?? 0) + params.weightIncrement;
        next.failureStreak = 0;
      } else if (outcome === "failure") {
        next.failureStreak += 1;
      }
      // "hold" leaves the streak untouched: only progress clears it, so three
      // failures interleaved with holds still accumulate toward the reset.
      if (next.failureStreak >= LP_FAILURE_RESET_TRIGGER) {
        applyIntensityReset(next);
      }
      break;
    }

    case "topset_backoff": {
      const params = config.progressionParams as TopSetProgressionParams;
      const { progressed, flagged } = evaluateTopSet(params, sets);
      if (progressed) {
        next.workingE1rm = (next.workingE1rm ?? 0) + params.weightIncrement;
        next.failureStreak = 0;
      } else if (flagged) {
        next.failureStreak += 1;
      }
      if (next.failureStreak >= TOP_SET_FAILURE_RESET_TRIGGER) {
        applyIntensityReset(next);
      }
      break;
    }

    case "double": {
      const params = config.progressionParams as DoubleProgressionParams;
      const evaluation = evaluateDouble(params, state, sets);
      if (evaluation.progressed) {
        next.workingE1rm = (next.workingE1rm ?? 0) + params.weightIncrement;
        next.regressionStreak = 0;
        next.plateauStreak = 0;
      } else {
        switch (evaluation.comparison) {
          case "regression":
            next.regressionStreak += 1;
            next.plateauStreak = 0;
            break;
          case "plateau":
            next.plateauStreak += 1;
            next.regressionStreak = 0;
            break;
          default:
            next.regressionStreak = 0;
            next.plateauStreak = 0;
        }
      }
      next.currentTargetReps = evaluation.nextTargetReps;
      next.lastSessionReps = evaluation.totalReps;
      next.lastSessionWeight = evaluation.sessionWeight;
      if (
        next.regressionStreak >= DOUBLE_REGRESSION_RESET_TRIGGER ||
        next.plateauStreak >= DOUBLE_PLATEAU_RESET_TRIGGER
      ) {
        applyVolumeReset(next);
      }
      break;
    }
  }

  return next;
}
