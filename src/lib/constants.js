/**
 * @fileoverview Constants and enumerations for the strength training progression system.
 * 
 * This module defines the core progression types used throughout the application.
 * Each type represents a different mathematical model for progressing weight/reps
 * over time, suited to different training contexts and experience levels.
 */

/**
 * Progression type enumeration.
 * 
 * Defines the available progression strategies for exercise entries.
 * This is implemented as a frozen object to prevent modification at runtime,
 * providing enum-like behavior in JavaScript.
 * 
 * @typedef {Object} ProgressionTypeEnum
 * @property {string} RPE_AUTOREG - RPE-based autoregulation for main compound lifts
 * @property {string} LINKED_BACKOFF - Volume work linked to a top set weight
 * @property {string} DOUBLE_PROGRESSION - Rep-then-weight progression for accessories
 * @property {string} LINEAR_FIXED - Simple fixed weight increments for beginners
 * @property {string} AMRAP_AUTOREG - AMRAP-based progression with bonus rep scaling
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
 * 
 * @constant {Readonly<ProgressionTypeEnum>}
 */
export const ProgressionType = Object.freeze({
	RPE_AUTOREG: 'RPE_AUTOREG',
	LINKED_BACKOFF: 'LINKED_BACKOFF',
	DOUBLE_PROGRESSION: 'DOUBLE_PROGRESSION',
	LINEAR_FIXED: 'LINEAR_FIXED',
	AMRAP_AUTOREG: 'AMRAP_AUTOREG',
});

/**
 * Default progression settings for each progression type.
 * These can be overridden per-exercise but provide sensible starting points.
 * 
 * @constant {Readonly<Object>}
 */
export const DefaultProgressionSettings = Object.freeze({
	[ProgressionType.RPE_AUTOREG]: {
		/** Target RPE for the set (6-10 scale) */
		targetRpe: 8,
		/** Target number of reps */
		targetReps: 5,
		/** Weight increase when RPE is below target (in kg or lb) */
		incrementOnSuccess: 2.5,
		/** RPE tolerance before flagging for review */
		rpeTolerance: 0.5,
	},
	[ProgressionType.LINKED_BACKOFF]: {
		/** Percentage offset from top set (negative = lighter, positive = heavier) */
		offsetPct: -0.10,
		/** ID of the parent exercise entry (must be set per-instance) */
		parentEntryId: null,
	},
	[ProgressionType.DOUBLE_PROGRESSION]: {
		/** Minimum reps in the progression range */
		repFloor: 8,
		/** Maximum reps in the progression range */
		repCeiling: 12,
		/** Weight increase when ceiling is reached */
		weightIncrement: 2.5,
	},
	[ProgressionType.LINEAR_FIXED]: {
		/** Fixed weight to add on successful completion */
		fixedIncrement: 2.5,
		/** Target reps to complete */
		targetReps: 5,
		/** Number of sets that must be completed */
		targetSets: 3,
	},
	[ProgressionType.AMRAP_AUTOREG]: {
		/** Minimum reps to hit */
		minReps: 5,
		/** Weight increase per bonus rep */
		incrementPerBonusRep: 2.5,
		/** Maximum weight increase regardless of bonus reps */
		maxIncrement: 10,
	},
});

/**
 * Helper function to validate a progression type.
 * 
 * @param {string} type - The progression type to validate
 * @returns {boolean} True if the type is valid
 */
export function isValidProgressionType(type) {
	return Object.values(ProgressionType).includes(type);
}

/**
 * Helper function to get default settings for a progression type.
 * 
 * @param {string} type - The progression type
 * @returns {Object|null} The default settings, or null if type is invalid
 */
export function getDefaultSettings(type) {
	if (!isValidProgressionType(type)) {
		return null;
	}
	return { ...DefaultProgressionSettings[type] };
}
