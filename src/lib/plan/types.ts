/**
 * Training Plan Types
 * Defines the data shapes for Plans (Configuration) and Session Logs (Execution)
 */

/**
 * Progression Type Enum
 * Determines how weight progression is calculated
 */
export enum ProgressionType {
	RPE_TARGET = "RPE_TARGET",
	LINKED_BACKOFF = "LINKED_BACKOFF",
	DOUBLE_PROGRESSION = "DOUBLE_PROGRESSION",
}

/**
 * RPE-based progression configuration
 * Tracks estimated 1RM and targets specific RPE/rep combinations
 */
export interface RPEConfig {
	targetRpe: number;
	targetReps: number;
	currentE1RM: number; // Estimated 1 Rep Max
}

/**
 * Backoff set configuration
 * Links to a parent exercise and applies a percentage offset
 */
export interface BackoffConfig {
	parentId: string; // Reference to parent ExerciseSlot
	offsetPercent: number; // Percentage offset (e.g., -10 for 10% reduction)
}

/**
 * Double progression configuration
 * Increases weight when reps exceed a threshold
 */
export interface DoubleProgressionConfig {
	minReps: number;
	maxReps: number;
	increment: number; // Weight increment when maxReps is achieved
	currentLoad: number; // Next scheduled weight (not necessarily today's lift)
}

/**
 * ExerciseSlot - The Plan (Configuration)
 * Discriminated union based on ProgressionType
 */
export type ExerciseSlot =
	| {
		id: string;
		exerciseId: string;
		type: ProgressionType.RPE_TARGET;
		config: RPEConfig;
	}
	| {
		id: string;
		exerciseId: string;
		type: ProgressionType.LINKED_BACKOFF;
		config: BackoffConfig;
	}
	| {
		id: string;
		exerciseId: string;
		type: ProgressionType.DOUBLE_PROGRESSION;
		config: DoubleProgressionConfig;
	};

/**
 * SessionLog - The History (Execution)
 * Records what actually happened during a training session
 */
export interface SessionLog {
	slotId: string; // Links back to the ExerciseSlot
	date: Date;
	actualWeight: number; // The weight actually lifted
	actualReps: number;
	actualRPE: number;
}
