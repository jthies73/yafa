/**
 * @fileoverview Core progression logic engine for strength training calculations.
 * 
 * This module contains pure functions for calculating progression based on
 * performance data. All functions are deterministic and side-effect free.
 */

import { ProgressionType } from './constants.js';

/**
 * @typedef {import('./models.js').ExerciseEntry} ExerciseEntry
 * @typedef {import('./models.js').WorkoutLog} WorkoutLog
 */

/**
 * @typedef {Object} NextStateResult
 * @property {number} nextWeight - Recommended weight for next session
 * @property {number|null} nextReps - Recommended reps for next session (null if same as current)
 * @property {boolean} needsReview - Flag indicating user should review before proceeding
 * @property {string|null} message - Human-readable explanation of the calculation
 * @property {Object} metadata - Additional calculation details
 */

/**
 * ProgressionCalculator class containing pure functions for progression math.
 * 
 * @class ProgressionCalculator
 */
export class ProgressionCalculator {
	/**
	 * Calculates the next state for an exercise based on recent performance.
	 * This is the main entry point for progression calculations.
	 * 
	 * @param {ExerciseEntry} entry - The current exercise configuration
	 * @param {WorkoutLog[]} logs - Array of recent workout logs for this entry, sorted by date descending
	 * @returns {NextStateResult} The calculated next state
	 */
	static calculateNextState(entry, logs) {
		if (!logs || logs.length === 0) {
			return {
				nextWeight: entry.currentWeight,
				nextReps: entry.currentReps,
				needsReview: false,
				message: 'No logs available. Using current weight.',
				metadata: {},
			};
		}

		// Route to appropriate progression logic based on type
		switch (entry.progressionType) {
			case ProgressionType.RPE_AUTOREG:
				return this._calculateRpeAutoregProgression(entry, logs);

			case ProgressionType.DOUBLE_PROGRESSION:
				return this._calculateDoubleProgression(entry, logs);

			case ProgressionType.LINEAR_FIXED:
				return this._calculateLinearFixedProgression(entry, logs);

			case ProgressionType.AMRAP_AUTOREG:
				return this._calculateAmrapAutoregProgression(entry, logs);

			case ProgressionType.LINKED_BACKOFF:
				// LINKED_BACKOFF is calculated in real-time during workout
				// This shouldn't normally be called for progression
				return {
					nextWeight: entry.currentWeight,
					nextReps: entry.targetReps,
					needsReview: false,
					message: 'LINKED_BACKOFF sets are calculated in real-time from parent set.',
					metadata: {},
				};

			default:
				return {
					nextWeight: entry.currentWeight,
					nextReps: entry.currentReps,
					needsReview: true,
					message: `Unknown progression type: ${entry.progressionType}`,
					metadata: {},
				};
		}
	}

	/**
	 * Calculates E1RM (Estimated 1 Rep Max) using the Brzycki formula.
	 * This is adjusted for RPE to account for reps in reserve.
	 * 
	 * Formula: E1RM = weight × (36 / (37 - reps))
	 * With RPE adjustment: effective reps = actual reps + (10 - RPE)
	 * 
	 * @param {number} weight - Weight lifted
	 * @param {number} reps - Reps completed
	 * @param {number} rpe - Rate of Perceived Exertion (6-10 scale)
	 * @returns {number} Estimated 1RM
	 */
	static calculateE1RM(weight, reps, rpe) {
		// Adjust reps based on RPE (reps in reserve)
		// RPE 10 = 0 RIR, RPE 9 = 1 RIR, RPE 8 = 2 RIR, etc.
		const effectiveReps = reps + (10 - rpe);

		// Brzycki formula
		// For effectiveReps = 1, this returns weight (as expected for a true 1RM)
		if (effectiveReps >= 37) {
			// Formula breaks down at high reps, use conservative estimate
			return weight * (1 + effectiveReps * 0.025);
		}

		const e1rm = weight * (36 / (37 - effectiveReps));
		return Math.round(e1rm * 100) / 100; // Round to 2 decimal places
	}

	/**
	 * Calculates the target weight for backoff sets based on top set weight.
	 * This is used in real-time during a workout, not for next-session planning.
	 * 
	 * @param {number} topSetWeight - The weight used in the top/main set
	 * @param {Object} settings - Settings object containing offsetPct
	 * @param {number} settings.offsetPct - Percentage offset (e.g., -0.10 for -10%)
	 * @returns {number} The calculated backoff weight
	 */
	static calculateBackoff(topSetWeight, settings) {
		const { offsetPct = -0.10 } = settings;
		const backoffWeight = topSetWeight * (1 + offsetPct);
		return Math.round(backoffWeight * 100) / 100; // Round to 2 decimal places
	}

	/**
	 * RPE-based autoregulation progression.
	 * Adjusts weight based on how difficult the last set felt.
	 * 
	 * @private
	 * @param {ExerciseEntry} entry - The exercise entry
	 * @param {WorkoutLog[]} logs - Recent logs
	 * @returns {NextStateResult} Next state
	 */
	static _calculateRpeAutoregProgression(entry, logs) {
		const lastLog = logs[0]; // Most recent log
		const { targetRpe, targetReps, settings } = entry;
		const { incrementOnSuccess = 2.5, rpeTolerance = 0.5 } = settings;

		if (!lastLog.actualRpe) {
			return {
				nextWeight: entry.currentWeight,
				nextReps: targetReps,
				needsReview: true,
				message: 'No RPE recorded in last workout. Cannot auto-progress.',
				metadata: { lastLog },
			};
		}

		const rpeDifference = lastLog.actualRpe - targetRpe;

		// Case 1: RPE is within tolerance - maintain
		if (Math.abs(rpeDifference) <= rpeTolerance) {
			return {
				nextWeight: entry.currentWeight,
				nextReps: targetReps,
				needsReview: false,
				message: `RPE ${lastLog.actualRpe} is on target (±${rpeTolerance}). Maintaining weight.`,
				metadata: { lastLog, rpeDifference },
			};
		}

		// Case 2: RPE is lower than target - increase weight
		if (rpeDifference < 0) {
			const newWeight = entry.currentWeight + incrementOnSuccess;
			return {
				nextWeight: newWeight,
				nextReps: targetReps,
				needsReview: false,
				message: `RPE ${lastLog.actualRpe} was easier than target ${targetRpe}. Increasing weight by ${incrementOnSuccess}.`,
				metadata: { lastLog, rpeDifference, increment: incrementOnSuccess },
			};
		}

		// Case 3: RPE is higher than target - flag for review
		// We do NOT auto-reduce to prevent de-training
		return {
			nextWeight: entry.currentWeight,
			nextReps: targetReps,
			needsReview: true,
			message: `RPE ${lastLog.actualRpe} exceeded target ${targetRpe}. Review recommended - consider deload, fatigue, or technique issues.`,
			metadata: { lastLog, rpeDifference },
		};
	}

	/**
	 * Double progression: increase reps until ceiling, then increase weight.
	 * 
	 * @private
	 * @param {ExerciseEntry} entry - The exercise entry
	 * @param {WorkoutLog[]} logs - Recent logs
	 * @returns {NextStateResult} Next state
	 */
	static _calculateDoubleProgression(entry, logs) {
		const lastLog = logs[0];
		const { settings } = entry;
		const { repFloor, repCeiling, weightIncrement = 2.5 } = settings;

		const currentReps = entry.currentReps || repFloor;
		const repsCompleted = lastLog.actualReps;

		// Case 1: Failed to complete target reps - maintain
		if (repsCompleted < currentReps) {
			return {
				nextWeight: entry.currentWeight,
				nextReps: currentReps,
				needsReview: false,
				message: `Only completed ${repsCompleted}/${currentReps} reps. Maintaining current prescription.`,
				metadata: { lastLog, repFloor, repCeiling },
			};
		}

		// Case 2: Completed reps but haven't hit ceiling - increase reps
		if (currentReps < repCeiling) {
			const nextReps = Math.min(currentReps + 1, repCeiling);
			return {
				nextWeight: entry.currentWeight,
				nextReps: nextReps,
				needsReview: false,
				message: `Completed ${repsCompleted} reps. Progressing to ${nextReps} reps next session.`,
				metadata: { lastLog, repFloor, repCeiling },
			};
		}

		// Case 3: Hit ceiling - increase weight and reset to floor
		const newWeight = entry.currentWeight + weightIncrement;
		return {
			nextWeight: newWeight,
			nextReps: repFloor,
			needsReview: false,
			message: `Completed rep ceiling (${repCeiling}). Increasing weight by ${weightIncrement} and resetting to ${repFloor} reps.`,
			metadata: { lastLog, repFloor, repCeiling, weightIncrement },
		};
	}

	/**
	 * Linear fixed progression: add fixed weight on successful completion.
	 * 
	 * @private
	 * @param {ExerciseEntry} entry - The exercise entry
	 * @param {WorkoutLog[]} logs - Recent logs
	 * @returns {NextStateResult} Next state
	 */
	static _calculateLinearFixedProgression(entry, logs) {
		const { targetReps, settings } = entry;
		const { fixedIncrement = 2.5, targetSets = 3 } = settings;

		// Get logs from the last session (same date)
		const lastSessionDate = logs[0].date.split('T')[0]; // Get date part only
		const lastSessionLogs = logs.filter(log => log.date.startsWith(lastSessionDate));

		// Count successful sets (completed target reps)
		const successfulSets = lastSessionLogs.filter(
			log => log.completed && log.actualReps >= targetReps
		).length;

		// Case 1: Failed to complete all sets - maintain
		if (successfulSets < targetSets) {
			return {
				nextWeight: entry.currentWeight,
				nextReps: targetReps,
				needsReview: false,
				message: `Completed ${successfulSets}/${targetSets} sets. Maintaining weight.`,
				metadata: { lastSessionLogs, successfulSets, targetSets },
			};
		}

		// Case 2: Completed all sets - increase weight
		const newWeight = entry.currentWeight + fixedIncrement;
		return {
			nextWeight: newWeight,
			nextReps: targetReps,
			needsReview: false,
			message: `Completed ${successfulSets}/${targetSets} sets. Increasing weight by ${fixedIncrement}.`,
			metadata: { lastSessionLogs, successfulSets, targetSets, fixedIncrement },
		};
	}

	/**
	 * AMRAP autoregulation: weight increase scales with bonus reps.
	 * 
	 * @private
	 * @param {ExerciseEntry} entry - The exercise entry
	 * @param {WorkoutLog[]} logs - Recent logs
	 * @returns {NextStateResult} Next state
	 */
	static _calculateAmrapAutoregProgression(entry, logs) {
		const lastLog = logs[0];
		const { settings } = entry;
		const { minReps, incrementPerBonusRep = 2.5, maxIncrement = 10 } = settings;

		const bonusReps = lastLog.bonusReps !== null 
			? lastLog.bonusReps 
			: Math.max(0, lastLog.actualReps - minReps);

		// Case 1: Failed to hit minimum reps - maintain or flag for review
		if (lastLog.actualReps < minReps) {
			return {
				nextWeight: entry.currentWeight,
				nextReps: null,
				needsReview: true,
				message: `Only completed ${lastLog.actualReps}/${minReps} minimum reps. Consider reducing weight.`,
				metadata: { lastLog, bonusReps: 0, minReps },
			};
		}

		// Case 2: Hit minimum reps - increase based on bonus reps
		const rawIncrement = bonusReps * incrementPerBonusRep;
		const cappedIncrement = Math.min(rawIncrement, maxIncrement);
		const newWeight = entry.currentWeight + cappedIncrement;

		return {
			nextWeight: newWeight,
			nextReps: null,
			needsReview: false,
			message: `Completed ${lastLog.actualReps} reps (${bonusReps} bonus). Increasing weight by ${cappedIncrement}.`,
			metadata: { lastLog, bonusReps, minReps, rawIncrement, cappedIncrement, maxIncrement },
		};
	}
}

/**
 * Standalone helper function to calculate E1RM.
 * Wrapper around ProgressionCalculator.calculateE1RM for convenience.
 * 
 * @param {number} weight - Weight lifted
 * @param {number} reps - Reps completed
 * @param {number} rpe - Rate of Perceived Exertion (6-10 scale)
 * @returns {number} Estimated 1RM
 */
export function calculateE1RM(weight, reps, rpe) {
	return ProgressionCalculator.calculateE1RM(weight, reps, rpe);
}

/**
 * Standalone helper function to calculate backoff weight.
 * Wrapper around ProgressionCalculator.calculateBackoff for convenience.
 * 
 * @param {number} topSetWeight - The weight used in the top set
 * @param {Object} settings - Settings object containing offsetPct
 * @returns {number} The calculated backoff weight
 */
export function calculateBackoff(topSetWeight, settings) {
	return ProgressionCalculator.calculateBackoff(topSetWeight, settings);
}
