/**
 * Progression Logic Engine
 * Updates the Plan (ExerciseSlot) based on execution results (SessionLog)
 */

import { calculateE1RM } from "@/lib/utils/rmCalculator";
import { ExerciseSlot, ProgressionType, SessionLog } from "./types";

/**
 * Calculates the next state of an ExerciseSlot based on a SessionLog
 * @param slot - The current exercise plan configuration
 * @param log - The actual execution data from the session
 * @returns A new ExerciseSlot with updated progression values
 */
export function calculateNextState(slot: ExerciseSlot, log: SessionLog): ExerciseSlot {
	// Validate that the log matches the slot
	if (slot.id !== log.slotId) {
		throw new Error(`SessionLog slotId (${log.slotId}) does not match ExerciseSlot id (${slot.id})`);
	}

	// Apply progression logic based on slot type
	switch (slot.type) {
		case ProgressionType.RPE_TARGET:
			return updateRPEProgression(slot, log);

		case ProgressionType.DOUBLE_PROGRESSION:
			return updateDoubleProgression(slot, log);

		case ProgressionType.LINKED_BACKOFF:
			// Backoff sets don't update themselves - they derive from parent
			// Return unchanged slot
			return slot;

		default: {
			// TypeScript should ensure this is unreachable
			const _exhaustiveCheck: never = slot;
			return _exhaustiveCheck;
		}
	}
}

/**
 * Updates RPE-based progression using Brzycki formula
 * Recalculates E1RM based on actual performance
 */
function updateRPEProgression(
	slot: ExerciseSlot & { type: ProgressionType.RPE_TARGET },
	log: SessionLog,
): ExerciseSlot {
	// Calculate new E1RM using Brzycki formula based on actual performance
	const newE1RM = calculateE1RM(log.actualWeight, log.actualReps, log.actualRPE, "brzycki");

	return {
		...slot,
		config: {
			...slot.config,
			currentE1RM: newE1RM,
		},
	};
}

/**
 * Updates double progression
 * If actualReps >= maxReps, increase currentLoad by increment
 */
function updateDoubleProgression(
	slot: ExerciseSlot & { type: ProgressionType.DOUBLE_PROGRESSION },
	log: SessionLog,
): ExerciseSlot {
	const { config } = slot;

	// Check if we hit the progression threshold
	if (log.actualReps >= config.maxReps) {
		// Increase the load for next session
		return {
			...slot,
			config: {
				...config,
				currentLoad: config.currentLoad + config.increment,
			},
		};
	}

	// No progression needed, return unchanged
	return slot;
}
