import type { Exercise, Workout } from "../db/types";

// ----------------------------------------------
// Post-workout summary — STUBBED. PR detection, adherence scoring, and volume
// math have been removed and will be rewritten later. The shapes are kept so the
// summary sheet compiles; computeWorkoutSummary returns an empty summary for now.
// ----------------------------------------------

/** Completed vs planned working-set counts; overshoot flags junk volume. */
export interface SetCounts {
  completed: number;
  planned: number;
  overshoot: boolean;
}

export interface AdherenceResult {
  score: number; // 0..100
  prescribedSets: number;
  extraSets: number;
}

export type PrType = "e1rm" | "rep" | "volume";

/** One progression marker earned in the session. */
export interface PrResult {
  exerciseId: string;
  exerciseName: string;
  type: PrType;
  e1rm?: number;
  weight?: number;
  reps?: number;
  rpe?: number;
  volume?: number;
}

export interface WorkoutSummary {
  durationMs: number;
  sets: SetCounts;
  volumeLoad: number;
  adherence: AdherenceResult;
  prs: PrResult[];
}

export interface SummaryInput {
  workout: Workout;
  history: Workout[];
  exercisesById: Map<string, Exercise>;
  plannedCounts: Record<string, number>;
}

/** Stubbed: returns an empty summary until the evaluation engine is rewritten. */
export function computeWorkoutSummary(_input: SummaryInput): WorkoutSummary {
  return {
    durationMs: 0,
    sets: { completed: 0, planned: 0, overshoot: false },
    volumeLoad: 0,
    adherence: { score: 0, prescribedSets: 0, extraSets: 0 },
    prs: [],
  };
}
