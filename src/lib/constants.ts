/**
 * @fileoverview Constants and enumerations for the strength training progression system.
 * 
 * This module defines the core progression types used throughout the application.
 * Each type represents a different mathematical model for progressing weight/reps
 * over time, suited to different training contexts and experience levels.
 */

/**
 * ProgressionType defines the mathematical model used to calculate
 * the next workout's parameters based on previous performance.
 * 
 * ## RPE_AUTOREG (Rate of Perceived Exertion - Autoregulation)
 * **Use Case:** Main compound lifts (Squat, Bench, Deadlift, OHP)
 * **How it works:** 
 * - Adjusts the baseline estimated 1RM based on the difficulty (RPE) of the last set
 * - If RPE is lower than target, increases weight for next session
 * - If RPE equals target, maintains current progression
 * - If RPE exceeds target, flags for user review (no auto-reduction to prevent de-training)
 * **Example:** Target is 3 reps @ RPE 8. If you hit RPE 7, weight increases next time.
 * 
 * ## LINKED_BACKOFF
 * **Use Case:** Back-off sets or volume work following a top set
 * **How it works:**
 * - Weight is calculated as a percentage offset from the day's top set
 * - Runs in real-time during the workout (not for next session planning)
 * - No independent progression - always relative to parent exercise
 * **Example:** After a 315lb top set, backoff sets might be at 315 * 0.90 = 283.5lb (-10%)
 * 
 * ## DOUBLE_PROGRESSION
 * **Use Case:** Accessory movements and isolation exercises
 * **How it works:**
 * - Phase 1: Increase reps while maintaining weight (e.g., 8 → 9 → 10 → 11 → 12)
 * - Phase 2: When rep ceiling is reached, increase weight and drop back to rep floor
 * - Provides a clear progression path without complex calculations
 * **Example:** 3x8-12 DB Curl. Progress 20lb x 8 → 8 → 9 → 10 → 11 → 12, then 22.5lb x 8
 * 
 * ## LINEAR_FIXED
 * **Use Case:** Beginner programs or simple linear progression
 * **How it works:**
 * - Add a fixed amount of weight each successful session (e.g., +5lb)
 * - Simple and predictable for those new to training
 * - No RPE or complex math required
 * **Example:** Successfully complete 3x5 @ 135lb → next session is 3x5 @ 140lb
 * 
 * ## AMRAP_AUTOREG (As Many Reps As Possible - Autoregulation)
 * **Use Case:** AMRAP sets or testing days
 * **How it works:**
 * - Target rep range with "bonus reps" counted beyond the minimum
 * - Weight increase scales with number of bonus reps achieved
 * - More bonus reps = larger weight jump next session
 * **Example:** Target 5+ reps. If you hit 8 (3 bonus), weight increases more than hitting 6 (1 bonus)
 */
export const ProgressionType = Object.freeze({
	RPE_AUTOREG: 'RPE_AUTOREG',
	LINKED_BACKOFF: 'LINKED_BACKOFF',
	DOUBLE_PROGRESSION: 'DOUBLE_PROGRESSION',
	LINEAR_FIXED: 'LINEAR_FIXED',
	AMRAP_AUTOREG: 'AMRAP_AUTOREG',
} as const);

export type ProgressionTypeKey = keyof typeof ProgressionType;
export type ProgressionTypeValue = typeof ProgressionType[ProgressionTypeKey];

/**
 * Settings for RPE-based autoregulation
 */
export interface RpeAutoregSettings {
	/** Target RPE for the set (6-10 scale) */
	targetRpe: number;
	/** Target number of reps */
	targetReps: number;
	/** Weight increase when RPE is below target (in kg or lb) */
	incrementOnSuccess: number;
	/** RPE tolerance before flagging for review */
	rpeTolerance: number;
}

/**
 * Settings for linked backoff sets
 */
export interface LinkedBackoffSettings {
	/** Percentage offset from top set (negative = lighter, positive = heavier) */
	offsetPct: number;
	/** ID of the parent exercise entry (must be set per-instance) */
	parentEntryId: string | null;
}

/**
 * Settings for double progression
 */
export interface DoubleProgressionSettings {
	/** Minimum reps in the progression range */
	repFloor: number;
	/** Maximum reps in the progression range */
	repCeiling: number;
	/** Weight increase when ceiling is reached */
	weightIncrement: number;
}

/**
 * Settings for linear fixed progression
 */
export interface LinearFixedSettings {
	/** Fixed weight to add on successful completion */
	fixedIncrement: number;
	/** Target reps to complete */
	targetReps: number;
	/** Number of sets that must be completed */
	targetSets: number;
}

/**
 * Settings for AMRAP autoregulation
 */
export interface AmrapAutoregSettings {
	/** Minimum reps to hit */
	minReps: number;
	/** Weight increase per bonus rep */
	incrementPerBonusRep: number;
	/** Maximum weight increase regardless of bonus reps */
	maxIncrement: number;
}

/**
 * Union type for all progression settings
 */
export type ProgressionSettings =
	| RpeAutoregSettings
	| LinkedBackoffSettings
	| DoubleProgressionSettings
	| LinearFixedSettings
	| AmrapAutoregSettings;

/**
 * Default progression settings for each progression type.
 * These can be overridden per-exercise but provide sensible starting points.
 */
export const DefaultProgressionSettings = Object.freeze({
	[ProgressionType.RPE_AUTOREG]: {
		targetRpe: 8,
		targetReps: 5,
		incrementOnSuccess: 2.5,
		rpeTolerance: 0.5,
	} as RpeAutoregSettings,
	[ProgressionType.LINKED_BACKOFF]: {
		offsetPct: -0.10,
		parentEntryId: null,
	} as LinkedBackoffSettings,
	[ProgressionType.DOUBLE_PROGRESSION]: {
		repFloor: 8,
		repCeiling: 12,
		weightIncrement: 2.5,
	} as DoubleProgressionSettings,
	[ProgressionType.LINEAR_FIXED]: {
		fixedIncrement: 2.5,
		targetReps: 5,
		targetSets: 3,
	} as LinearFixedSettings,
	[ProgressionType.AMRAP_AUTOREG]: {
		minReps: 5,
		incrementPerBonusRep: 2.5,
		maxIncrement: 10,
	} as AmrapAutoregSettings,
} as const);

/**
 * Helper function to validate a progression type.
 * 
 * @param type - The progression type to validate
 * @returns True if the type is valid
 */
export function isValidProgressionType(type: string): type is ProgressionTypeValue {
	return Object.values(ProgressionType).includes(type as ProgressionTypeValue);
}

/**
 * Helper function to get default settings for a progression type.
 * 
 * @param type - The progression type
 * @returns The default settings, or null if type is invalid
 */
export function getDefaultSettings(type: string): Partial<ProgressionSettings> | null {
	if (!isValidProgressionType(type)) {
		return null;
	}
	return { ...DefaultProgressionSettings[type] };
}
