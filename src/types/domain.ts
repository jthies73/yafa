export interface Plan {
  id: string;
  name: string;
  routines: Routine[];
  createdAt: string;
}

export interface Routine {
  id: string;
  name: string;
  slots: ExerciseSlot[];
}

export interface ExerciseSlot {
  id: string;
  exerciseId: string;
  setScheme: SetScheme;
  progression: ProgressionConfig;
}

export interface SetScheme {
  sets: number;
  reps: number;         // Target reps
  rpe: number;          // Target RPE
  restSeconds: number;
}

export type ProgressionConfig =
  | RpeAutoregConfig
  | LinkedBackoffConfig
  | DoubleProgressionConfig;

export interface RpeAutoregConfig {
  type: 'RPE_AUTOREG';
  targetRpe: number;          // e.g., 8
  e1rmAdjustment: 'ALWAYS' | 'ON_PR' | 'MANUAL';
}

export interface LinkedBackoffConfig {
  type: 'LINKED_BACKOFF';
  topSetRpe: number;
  backoffPercent: number;     // e.g., 0.90 = 90% of top set weight
  backoffSets: number;
  backoffReps: number;
}

export interface DoubleProgressionConfig {
  type: 'DOUBLE_PROGRESSION';
  repRange: { min: number; max: number };
  weightIncrement: number;
}
