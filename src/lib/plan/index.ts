/**
 * Training Plan Module
 * Public API exports for plan types, factories, and progression logic
 */

// Types and Enums
export { ProgressionType } from "./types";
export type {
	BackoffConfig,
	DoubleProgressionConfig,
	ExerciseSlot,
	RPEConfig,
	SessionLog,
} from "./types";

// Factory Functions
export {
	createBackoffSlot,
	createDoubleProgressionSlot,
	createLog,
	createRPESlot,
	createSlot,
} from "./factories";

// Progression Logic
export { calculateNextState } from "./progression";
