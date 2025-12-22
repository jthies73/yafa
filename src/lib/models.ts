/**
 * @fileoverview Data models for the strength training progression system.
 * 
 * All models are designed to be JSON-serializable for storage in IndexedDB.
 * Each class provides a toJSON() method for explicit serialization control.
 */

import { ProgressionSettings, ProgressionType, ProgressionTypeValue, getDefaultSettings } from './constants';

/**
 * Data structure for ExerciseEntry
 */
export interface ExerciseEntryData {
	id: string;
	exerciseId: string;
	progressionType: string;
	targetRpe: number | null;
	targetReps: number | null;
	settings: Partial<ProgressionSettings>;
	currentWeight: number;
	currentReps: number | null;
	parentEntryId: string | null;
	metadata: Record<string, unknown>;
}

/**
 * Constructor parameters for ExerciseEntry
 */
export interface ExerciseEntryParams {
	id: string;
	exerciseId: string;
	progressionType: ProgressionTypeValue;
	targetRpe?: number | null;
	targetReps?: number | null;
	settings?: Partial<ProgressionSettings>;
	currentWeight?: number;
	currentReps?: number | null;
	parentEntryId?: string | null;
	metadata?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * ExerciseEntry represents a single exercise slot in a routine.
 * This is the configuration that defines how an exercise should progress over time.
 */
export class ExerciseEntry {
	public id: string;
	public exerciseId: string;
	public progressionType: ProgressionTypeValue;
	public targetRpe: number | null;
	public targetReps: number | null;
	public settings: Partial<ProgressionSettings>;
	public currentWeight: number;
	public currentReps: number | null;
	public parentEntryId: string | null;
	public metadata: Record<string, unknown>;

	/**
	 * Creates a new ExerciseEntry instance.
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
	}: ExerciseEntryParams) {
		this.id = id;
		this.exerciseId = exerciseId;
		this.progressionType = progressionType;
		this.targetRpe = targetRpe;
		this.targetReps = targetReps;
		this.settings = {
			...getDefaultSettings(progressionType),
			...settings,
		};
		this.currentWeight = currentWeight;
		this.currentReps = currentReps;
		this.parentEntryId = parentEntryId;
		this.metadata = metadata;
	}

	/**
	 * Validates that this entry has all required fields for its progression type.
	 */
	validate(): ValidationResult {
		const errors: string[] = [];

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
				if (typeof (this.settings as { offsetPct?: number }).offsetPct !== 'number') {
					errors.push('LINKED_BACKOFF requires settings.offsetPct as a number');
				}
				break;

			case ProgressionType.DOUBLE_PROGRESSION:
				if (!(this.settings as { repFloor?: number }).repFloor || !(this.settings as { repCeiling?: number }).repCeiling) {
					errors.push('DOUBLE_PROGRESSION requires settings.repFloor and settings.repCeiling');
				}
				if ((this.settings as { repFloor?: number; repCeiling?: number }).repFloor! >= (this.settings as { repFloor?: number; repCeiling?: number }).repCeiling!) {
					errors.push('DOUBLE_PROGRESSION repFloor must be less than repCeiling');
				}
				break;

			case ProgressionType.LINEAR_FIXED:
				if (this.targetReps === null) {
					errors.push('LINEAR_FIXED requires targetReps');
				}
				break;

			case ProgressionType.AMRAP_AUTOREG:
				if (!(this.settings as { minReps?: number }).minReps) {
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
	 */
	toJSON(): ExerciseEntryData {
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
	 */
	static fromJSON(data: ExerciseEntryData): ExerciseEntry {
		return new ExerciseEntry(data as ExerciseEntryParams);
	}
}

/**
 * Data structure for Routine
 */
export interface RoutineData {
	id: string;
	name: string;
	entryIds: string[];
	metadata: Record<string, unknown>;
}

/**
 * Constructor parameters for Routine
 */
export interface RoutineParams {
	id: string;
	name: string;
	entryIds?: string[];
	metadata?: Record<string, unknown>;
}

/**
 * Routine represents a collection of exercise entries forming a training day.
 */
export class Routine {
	public id: string;
	public name: string;
	public entryIds: string[];
	public metadata: Record<string, unknown>;

	/**
	 * Creates a new Routine instance.
	 */
	constructor({
		id,
		name,
		entryIds = [],
		metadata = {},
	}: RoutineParams) {
		this.id = id;
		this.name = name;
		this.entryIds = [...entryIds];
		this.metadata = metadata;
	}

	/**
	 * Adds an entry to this routine.
	 */
	addEntry(entryId: string): void {
		if (!this.entryIds.includes(entryId)) {
			this.entryIds.push(entryId);
		}
	}

	/**
	 * Removes an entry from this routine.
	 */
	removeEntry(entryId: string): void {
		this.entryIds = this.entryIds.filter(id => id !== entryId);
	}

	/**
	 * Serializes this routine to a plain JSON object for storage.
	 */
	toJSON(): RoutineData {
		return {
			id: this.id,
			name: this.name,
			entryIds: [...this.entryIds],
			metadata: { ...this.metadata },
		};
	}

	/**
	 * Creates a Routine from a plain object (e.g., from IndexedDB).
	 */
	static fromJSON(data: RoutineData): Routine {
		return new Routine(data);
	}
}

/**
 * Data structure for WorkoutLog
 */
export interface WorkoutLogData {
	id: string;
	entryId: string;
	date: string;
	actualReps: number;
	actualWeight: number;
	actualRpe: number | null;
	bonusReps: number | null;
	completed: boolean;
	metadata: Record<string, unknown>;
}

/**
 * Constructor parameters for WorkoutLog
 */
export interface WorkoutLogParams {
	id: string;
	entryId: string;
	date: string;
	actualReps: number;
	actualWeight: number;
	actualRpe?: number | null;
	bonusReps?: number | null;
	completed?: boolean;
	metadata?: Record<string, unknown>;
}

/**
 * WorkoutLog represents a record of a completed set.
 * Multiple logs can exist for the same entry (one per set performed).
 */
export class WorkoutLog {
	public id: string;
	public entryId: string;
	public date: string;
	public actualReps: number;
	public actualWeight: number;
	public actualRpe: number | null;
	public bonusReps: number | null;
	public completed: boolean;
	public metadata: Record<string, unknown>;

	/**
	 * Creates a new WorkoutLog instance.
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
	}: WorkoutLogParams) {
		this.id = id;
		this.entryId = entryId;
		this.date = date;
		this.actualReps = actualReps;
		this.actualWeight = actualWeight;
		this.actualRpe = actualRpe;
		this.bonusReps = bonusReps;
		this.completed = completed;
		this.metadata = metadata;
	}

	/**
	 * Validates that this log has all required fields.
	 */
	validate(): ValidationResult {
		const errors: string[] = [];

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
	 */
	toJSON(): WorkoutLogData {
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
	 */
	static fromJSON(data: WorkoutLogData): WorkoutLog {
		return new WorkoutLog(data);
	}
}
