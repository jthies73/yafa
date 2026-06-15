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
  DOUBLE_FAILURE_RESET_TRIGGER,
  LP_FAILURE_RESET_TRIGGER,
  TOP_SET_FAILURE_RESET_TRIGGER,
} from "./config";
import { observedE1rm } from "./matrix";
import { createIntensityResetModifier, intensityResetE1rm } from "./resets";

// ----------------------------------------------
// Progression models: session evaluation and state transitions. Pure — the
// service layer feeds logged sets in and persists the returned state.
// ----------------------------------------------

export type SessionOutcome = "success" | "failure";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * A set is a failure only when all three conditions hold simultaneously:
 * reps short of target, RPE over target, and the prescribed weight was used.
 * A weight deviation of ±2.5 kg (one loadable increment) means the lifter
 * intentionally adjusted the load — that set is excluded from failure scoring.
 */
function setFailed(s: LoggedSet): boolean {
  const targetRpe = s.targetRpe ?? DEFAULT_TARGET_RPE;
  return (
    s.actualReps < s.targetReps &&
    s.actualRpe !== undefined &&
    s.actualRpe > targetRpe &&
    Math.abs(s.actualWeight - s.targetWeight) < 1e-9
  );
}

/**
 * Linear progression: failure if ANY set at the prescribed weight missed reps
 * AND ran over the target RPE. Everything else is success.
 */
export function evaluateLinear(sets: LoggedSet[]): SessionOutcome {
  if (!sets.length) return "success";
  return sets.some(setFailed) ? "failure" : "success";
}

/**
 * Top set + back-off: only the TOP SET drives evaluation — the prescription
 * emits it first and the tracker preserves set order, so it is the first
 * logged set. Back-off sets are never evaluated here.
 */
export function evaluateTopSet(sets: LoggedSet[]): SessionOutcome {
  const top = sets[0];
  if (!top) return "success";
  return setFailed(top) ? "failure" : "success";
}

export interface DoubleEvaluation {
  weightProgressed: boolean;
  nextTargetReps: number;
  outcome: SessionOutcome;
}

export function evaluateDouble(
  params: DoubleProgressionParams,
  state: ProgressionState,
  sets: LoggedSet[],
): DoubleEvaluation {
  const current = state.currentTargetReps ?? params.minReps;
  if (!sets.length) {
    return { weightProgressed: false, nextTargetReps: current, outcome: "success" };
  }

  const weightProgressed = sets.every((s) => s.actualReps >= params.maxReps);
  const worstSetReps = Math.min(...sets.map((s) => s.actualReps));
  // The next rep goal advances toward maxReps anchored to the worst set
  // (weakest-set + 1), but never moves backwards — a bad day lowers nothing.
  const nextTargetReps = weightProgressed
    ? params.minReps
    : clamp(
        Math.max(current, worstSetReps + 1),
        params.minReps,
        params.maxReps,
      );

  const outcome = sets.some(setFailed) ? "failure" : "success";
  return { weightProgressed, nextTargetReps, outcome };
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
      const outcome = evaluateLinear(sets);
      if (outcome === "success") {
        next.workingE1rm = (next.workingE1rm ?? 0) + params.weightIncrement;
        next.failureStreak = 0;
      } else {
        next.failureStreak += 1;
        if (next.failureStreak >= LP_FAILURE_RESET_TRIGGER) {
          applyIntensityReset(next);
        }
      }
      break;
    }

    case "topset_backoff": {
      const params = config.progressionParams as TopSetProgressionParams;
      const outcome = evaluateTopSet(sets);
      if (outcome === "success") {
        next.workingE1rm = (next.workingE1rm ?? 0) + params.weightIncrement;
        next.failureStreak = 0;
      } else {
        next.failureStreak += 1;
        if (next.failureStreak >= TOP_SET_FAILURE_RESET_TRIGGER) {
          applyIntensityReset(next);
        }
      }
      break;
    }

    case "double": {
      const params = config.progressionParams as DoubleProgressionParams;
      const evaluation = evaluateDouble(params, state, sets);
      if (evaluation.weightProgressed) {
        next.workingE1rm = (next.workingE1rm ?? 0) + params.weightIncrement;
        next.failureStreak = 0;
      } else if (evaluation.outcome === "failure") {
        next.failureStreak += 1;
        if (next.failureStreak >= DOUBLE_FAILURE_RESET_TRIGGER) {
          applyIntensityReset(next);
        }
      } else {
        next.failureStreak = 0;
      }
      next.currentTargetReps = evaluation.nextTargetReps;
      break;
    }
  }

  return next;
}
