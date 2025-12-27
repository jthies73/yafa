/**
 * Factory Functions
 * Helper functions to create ExerciseSlots and SessionLogs with proper defaults
 */

import {
	BackoffConfig,
	DoubleProgressionConfig,
	ExerciseSlot,
	ProgressionType,
	RPEConfig,
	SessionLog,
} from "./types";

/**
 * Creates an ExerciseSlot with RPE_TARGET progression
 */
export function createRPESlot(
	id: string,
	exerciseId: string,
	targetRpe: number,
	targetReps: number,
	currentE1RM: number,
): ExerciseSlot {
	return {
		id,
		exerciseId,
		type: ProgressionType.RPE_TARGET,
		config: {
			targetRpe,
			targetReps,
			currentE1RM,
		},
	};
}

/**
 * Creates an ExerciseSlot with LINKED_BACKOFF progression
 */
export function createBackoffSlot(
	id: string,
	exerciseId: string,
	parentId: string,
	offsetPercent: number,
): ExerciseSlot {
	return {
		id,
		exerciseId,
		type: ProgressionType.LINKED_BACKOFF,
		config: {
			parentId,
			offsetPercent,
		},
	};
}

/**
 * Creates an ExerciseSlot with DOUBLE_PROGRESSION
 */
export function createDoubleProgressionSlot(
	id: string,
	exerciseId: string,
	minReps: number,
	maxReps: number,
	increment: number,
	currentLoad: number,
): ExerciseSlot {
	return {
		id,
		exerciseId,
		type: ProgressionType.DOUBLE_PROGRESSION,
		config: {
			minReps,
			maxReps,
			increment,
			currentLoad,
		},
	};
}

/**
 * Generic slot creator with type discrimination
 * Provides a unified interface for creating any type of slot
 */
export function createSlot(
	id: string,
	exerciseId: string,
	type: ProgressionType.RPE_TARGET,
	config: RPEConfig,
): ExerciseSlot;
export function createSlot(
	id: string,
	exerciseId: string,
	type: ProgressionType.LINKED_BACKOFF,
	config: BackoffConfig,
): ExerciseSlot;
export function createSlot(
	id: string,
	exerciseId: string,
	type: ProgressionType.DOUBLE_PROGRESSION,
	config: DoubleProgressionConfig,
): ExerciseSlot;
export function createSlot(
	id: string,
	exerciseId: string,
	type: ProgressionType,
	config: RPEConfig | BackoffConfig | DoubleProgressionConfig,
): ExerciseSlot {
	return {
		id,
		exerciseId,
		type,
		config,
	} as ExerciseSlot;
}

/**
 * Creates a SessionLog to record actual training execution
 */
export function createLog(
	slotId: string,
	weight: number,
	reps: number,
	rpe: number,
	date: Date = new Date(),
): SessionLog {
	return {
		slotId,
		date,
		actualWeight: weight,
		actualReps: reps,
		actualRPE: rpe,
	};
}
