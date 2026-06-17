import type { ProgressionModelType } from "../db/types";

// ----------------------------------------------
// Prescription view types. The prescription engine (base config + periodization
// modifiers → prescribed sets) has been removed and will be rewritten later;
// only the shapes the UI renders remain.
// ----------------------------------------------

export interface PrescribedSet {
  reps: number;
  rpe: number | null;
  weight: number | null; // null until a working e1RM has been seeded
  role: "straight" | "top" | "backoff";
}

export interface ExercisePrescription {
  exerciseId: string;
  model: ProgressionModelType;
  sets: PrescribedSet[];
  workingE1rm: number | null;
}
