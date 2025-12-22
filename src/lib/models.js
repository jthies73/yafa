/**
 * @fileoverview Data models for the strength training progression system.
 * 
 * All models are designed to be JSON-serializable for storage in IndexedDB.
 * Each class provides a toJSON() method for explicit serialization control.
 */

import { ProgressionType, getDefaultSettings } from './constants.js';

/**
 * @typedef {Object} ExerciseEntryData
 * @property {string} id - Unique identifier for this entry
 * @property {string} exerciseId - Reference to the exercise definition (e.g., "squat", "bench")
 * @property {string} progressionType - The progression strategy (from ProgressionType enum)
 * @property {number|null} targetRpe - Target RPE for RPE-based progressions (6-10 scale)
 * @property {number|null} targetReps - Target number of reps
 * @property {Object} settings - Type-specific settings (e.g., offsetPct, repFloor, etc.)
 * @property {number} currentWeight - Current working weight in kg or lb
 * @property {number|null} currentReps - Current working reps (for double progression)
 * @property {string|null} parentEntryId - Reference to parent entry for LINKED_BACKOFF
 * @property {Object} metadata - Additional flexible data (notes, tags, etc.)
 */

/**
 * ExerciseEntry represents a single exercise slot in a routine.
 * This is the configuration that defines how an exercise should progress over time.
 * 
 * @class ExerciseEntry
 */
export class ExerciseEntry {
	/**
	 * Creates a new ExerciseEntry instance.
	 * 
	 * @param {Object} params - Configuration parameters
	 * @param {string} params.id - Unique identifier
	 * @param {string} params.exerciseId - Exercise reference
	 * @param {string} params.progressionType - Progression strategy from ProgressionType
	 * @param {number} [params.targetRpe=null] - Target RPE (optional)
	 * @param {number} [params.targetReps=null] - Target reps (optional)
	 * @param {Object} [params.settings={}] - Progression-specific settings
	 * @param {number} [params.currentWeight=0] - Starting weight
	 * @param {number} [params.currentReps=null] - Starting reps (for double progression)
	 * @param {string} [params.parentEntryId=null] - Parent entry ID for backoff sets
	 * @param {Object} [params.metadata={}] - Additional metadata
	 */
	constructor({
		id,
		exerciseId,
		progressionType,
		targetRpe = null,
		targetReps = null,
		settings = {},
		currentWeight = 0,
		currentReps = null,
		parentEntryId = null,
		metadata = {},
	}) {
		/** @type {string} */
		this.id = id;
		
		/** @type {string} */
		this.exerciseId = exerciseId;
		
		/** @type {string} */
		this.progressionType = progressionType;
		
		/** @type {number|null} */
		this.targetRpe = targetRpe;
		
		/** @type {number|null} */
		this.targetReps = targetReps;
		
		/** @type {Object} */
		this.settings = {
			...getDefaultSettings(progressionType),
			...settings,
		};
		
		/** @type {number} */
		this.currentWeight = currentWeight;
		
		/** @type {number|null} */
		this.currentReps = currentReps;
		
		/** @type {string|null} */
		this.parentEntryId = parentEntryId;
		
		/** @type {Object} */
		this.metadata = metadata;
	}

	/**
	 * Validates that this entry has all required fields for its progression type.
	 * 
	 * @returns {Object} Validation result { valid: boolean, errors: string[] }
	 */
	validate() {
		const errors = [];

		if (!this.id) {
			errors.push('ExerciseEntry must have an id');
		}

		if (!this.exerciseId) {
			errors.push('ExerciseEntry must have an exerciseId');
		}

		if (!Object.values(ProgressionType).includes(this.progressionType)) {
			errors.push(`Invalid progressionType: ${this.progressionType}`);
		}

		// Type-specific validations
		switch (this.progressionType) {
			case ProgressionType.RPE_AUTOREG:
				if (this.targetRpe === null || this.targetRpe < 6 || this.targetRpe > 10) {
					errors.push('RPE_AUTOREG requires targetRpe between 6 and 10');
				}
				if (this.targetReps === null || this.targetReps < 1) {
					errors.push('RPE_AUTOREG requires targetReps >= 1');
				}
				break;

			case ProgressionType.LINKED_BACKOFF:
				if (!this.parentEntryId) {
					errors.push('LINKED_BACKOFF requires parentEntryId');
				}
				if (typeof this.settings.offsetPct !== 'number') {
					errors.push('LINKED_BACKOFF requires settings.offsetPct as a number');
				}
				break;

			case ProgressionType.DOUBLE_PROGRESSION:
				if (!this.settings.repFloor || !this.settings.repCeiling) {
					errors.push('DOUBLE_PROGRESSION requires settings.repFloor and settings.repCeiling');
				}
				if (this.settings.repFloor >= this.settings.repCeiling) {
					errors.push('DOUBLE_PROGRESSION repFloor must be less than repCeiling');
				}
				break;

			case ProgressionType.LINEAR_FIXED:
				if (this.targetReps === null) {
					errors.push('LINEAR_FIXED requires targetReps');
				}
				break;

			case ProgressionType.AMRAP_AUTOREG:
				if (!this.settings.minReps) {
					errors.push('AMRAP_AUTOREG requires settings.minReps');
				}
				break;
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serializes this entry to a plain JSON object for storage.
	 * 
	 * @returns {ExerciseEntryData} Plain object representation
	 */
	toJSON() {
		return {
			id: this.id,
			exerciseId: this.exerciseId,
			progressionType: this.progressionType,
			targetRpe: this.targetRpe,
			targetReps: this.targetReps,
			settings: { ...this.settings },
			currentWeight: this.currentWeight,
			currentReps: this.currentReps,
			parentEntryId: this.parentEntryId,
			metadata: { ...this.metadata },
		};
	}

	/**
	 * Creates an ExerciseEntry from a plain object (e.g., from IndexedDB).
	 * 
	 * @param {ExerciseEntryData} data - Plain object data
	 * @returns {ExerciseEntry} New ExerciseEntry instance
	 */
	static fromJSON(data) {
		return new ExerciseEntry(data);
	}
}

/**
 * @typedef {Object} RoutineData
 * @property {string} id - Unique identifier for this routine
 * @property {string} name - Human-readable name (e.g., "Upper A", "Lower B")
 * @property {string[]} entryIds - Array of ExerciseEntry IDs in this routine
 * @property {Object} metadata - Additional flexible data
 */

/**
 * Routine represents a collection of exercise entries forming a training day.
 * 
 * @class Routine
 */
export class Routine {
	/**
	 * Creates a new Routine instance.
	 * 
	 * @param {Object} params - Configuration parameters
	 * @param {string} params.id - Unique identifier
	 * @param {string} params.name - Routine name
	 * @param {string[]} [params.entryIds=[]] - Array of entry IDs
	 * @param {Object} [params.metadata={}] - Additional metadata
	 */
	constructor({
		id,
		name,
		entryIds = [],
		metadata = {},
	}) {
		/** @type {string} */
		this.id = id;
		
		/** @type {string} */
		this.name = name;
		
		/** @type {string[]} */
		this.entryIds = [...entryIds];
		
		/** @type {Object} */
		this.metadata = metadata;
	}

	/**
	 * Adds an entry to this routine.
	 * 
	 * @param {string} entryId - The entry ID to add
	 */
	addEntry(entryId) {
		if (!this.entryIds.includes(entryId)) {
			this.entryIds.push(entryId);
		}
	}

	/**
	 * Removes an entry from this routine.
	 * 
	 * @param {string} entryId - The entry ID to remove
	 */
	removeEntry(entryId) {
		this.entryIds = this.entryIds.filter(id => id !== entryId);
	}

	/**
	 * Serializes this routine to a plain JSON object for storage.
	 * 
	 * @returns {RoutineData} Plain object representation
	 */
	toJSON() {
		return {
			id: this.id,
			name: this.name,
			entryIds: [...this.entryIds],
			metadata: { ...this.metadata },
		};
	}

	/**
	 * Creates a Routine from a plain object (e.g., from IndexedDB).
	 * 
	 * @param {RoutineData} data - Plain object data
	 * @returns {Routine} New Routine instance
	 */
	static fromJSON(data) {
		return new Routine(data);
	}
}

/**
 * @typedef {Object} WorkoutLogData
 * @property {string} id - Unique identifier for this log entry
 * @property {string} entryId - Reference to the ExerciseEntry this log is for
 * @property {string} date - ISO 8601 date string of when this set was performed
 * @property {number} actualReps - Number of reps actually completed
 * @property {number} actualWeight - Weight used in kg or lb
 * @property {number|null} actualRpe - Perceived exertion (6-10 scale, or null if not tracked)
 * @property {number|null} bonusReps - Extra reps beyond target (for AMRAP)
 * @property {boolean} completed - Whether the set was successfully completed
 * @property {Object} metadata - Additional flexible data (notes, video links, etc.)
 */

/**
 * WorkoutLog represents a record of a completed set.
 * Multiple logs can exist for the same entry (one per set performed).
 * 
 * @class WorkoutLog
 */
export class WorkoutLog {
	/**
	 * Creates a new WorkoutLog instance.
	 * 
	 * @param {Object} params - Configuration parameters
	 * @param {string} params.id - Unique identifier
	 * @param {string} params.entryId - Entry ID this log belongs to
	 * @param {string} params.date - ISO 8601 date string
	 * @param {number} params.actualReps - Reps completed
	 * @param {number} params.actualWeight - Weight used
	 * @param {number} [params.actualRpe=null] - RPE recorded (optional)
	 * @param {number} [params.bonusReps=null] - Bonus reps for AMRAP (optional)
	 * @param {boolean} [params.completed=true] - Success flag
	 * @param {Object} [params.metadata={}] - Additional metadata
	 */
	constructor({
		id,
		entryId,
		date,
		actualReps,
		actualWeight,
		actualRpe = null,
		bonusReps = null,
		completed = true,
		metadata = {},
	}) {
		/** @type {string} */
		this.id = id;
		
		/** @type {string} */
		this.entryId = entryId;
		
		/** @type {string} */
		this.date = date;
		
		/** @type {number} */
		this.actualReps = actualReps;
		
		/** @type {number} */
		this.actualWeight = actualWeight;
		
		/** @type {number|null} */
		this.actualRpe = actualRpe;
		
		/** @type {number|null} */
		this.bonusReps = bonusReps;
		
		/** @type {boolean} */
		this.completed = completed;
		
		/** @type {Object} */
		this.metadata = metadata;
	}

	/**
	 * Validates that this log has all required fields.
	 * 
	 * @returns {Object} Validation result { valid: boolean, errors: string[] }
	 */
	validate() {
		const errors = [];

		if (!this.id) {
			errors.push('WorkoutLog must have an id');
		}

		if (!this.entryId) {
			errors.push('WorkoutLog must have an entryId');
		}

		if (!this.date) {
			errors.push('WorkoutLog must have a date');
		}

		if (typeof this.actualReps !== 'number' || this.actualReps < 0) {
			errors.push('WorkoutLog must have valid actualReps >= 0');
		}

		if (typeof this.actualWeight !== 'number' || this.actualWeight < 0) {
			errors.push('WorkoutLog must have valid actualWeight >= 0');
		}

		if (this.actualRpe !== null && (this.actualRpe < 6 || this.actualRpe > 10)) {
			errors.push('WorkoutLog actualRpe must be between 6 and 10 if provided');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Serializes this log to a plain JSON object for storage.
	 * 
	 * @returns {WorkoutLogData} Plain object representation
	 */
	toJSON() {
		return {
			id: this.id,
			entryId: this.entryId,
			date: this.date,
			actualReps: this.actualReps,
			actualWeight: this.actualWeight,
			actualRpe: this.actualRpe,
			bonusReps: this.bonusReps,
			completed: this.completed,
			metadata: { ...this.metadata },
		};
	}

	/**
	 * Creates a WorkoutLog from a plain object (e.g., from IndexedDB).
	 * 
	 * @param {WorkoutLogData} data - Plain object data
	 * @returns {WorkoutLog} New WorkoutLog instance
	 */
	static fromJSON(data) {
		return new WorkoutLog(data);
	}
}
