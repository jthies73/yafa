import { describe, expect, it } from "@jest/globals";

import { createDoubleProgressionSlot, createLog, createRPESlot } from "./factories";
import { calculateNextState } from "./progression";
import { ProgressionType } from "./types";

describe("Progression Logic", () => {
	describe("calculateNextState - RPE Progression", () => {
		it("should update currentE1RM using Brzycki formula when RPE slot is provided", () => {
			const slot = createRPESlot("slot1", "exercise1", 8, 5, 100);
			const log = createLog("slot1", 95, 5, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.type).toBe(ProgressionType.RPE_TARGET);
			if (nextSlot.type === ProgressionType.RPE_TARGET) {
				// With weight=95, reps=5, RPE=8, the E1RM should be calculated
				// Using Brzycki: E1RM = weight * (36 / (37 - reps_at_rpe_10))
				// reps_at_rpe_10 = 5 + (10 - 8) = 7
				// E1RM = 95 * (36 / (37 - 7)) = 95 * (36 / 30) = 114
				expect(nextSlot.config.currentE1RM).toBeGreaterThan(100);
				expect(nextSlot.config.currentE1RM).toBeCloseTo(114, 0);
			}
		});

		it("should calculate higher E1RM when actual performance exceeds plan", () => {
			const slot = createRPESlot("slot1", "exercise1", 9, 3, 100);
			// Performed 3 reps at 100kg and RPE 8 (easier than planned RPE 9)
			const log = createLog("slot1", 100, 3, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.type).toBe(ProgressionType.RPE_TARGET);
			if (nextSlot.type === ProgressionType.RPE_TARGET) {
				// Should result in higher E1RM than initial 100
				expect(nextSlot.config.currentE1RM).toBeGreaterThan(100);
			}
		});

		it("should preserve other config fields when updating E1RM", () => {
			const slot = createRPESlot("slot1", "exercise1", 8, 5, 100);
			const log = createLog("slot1", 95, 5, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.id).toBe("slot1");
			expect(nextSlot.exerciseId).toBe("exercise1");
			if (nextSlot.type === ProgressionType.RPE_TARGET) {
				expect(nextSlot.config.targetRpe).toBe(8);
				expect(nextSlot.config.targetReps).toBe(5);
			}
		});
	});

	describe("calculateNextState - Double Progression", () => {
		it("should increase currentLoad when actualReps >= maxReps", () => {
			const slot = createDoubleProgressionSlot("slot2", "exercise2", 8, 12, 2.5, 50);
			// Hit maxReps threshold
			const log = createLog("slot2", 50, 12, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.type).toBe(ProgressionType.DOUBLE_PROGRESSION);
			if (nextSlot.type === ProgressionType.DOUBLE_PROGRESSION) {
				expect(nextSlot.config.currentLoad).toBe(52.5); // 50 + 2.5
			}
		});

		it("should increase currentLoad when actualReps exceeds maxReps", () => {
			const slot = createDoubleProgressionSlot("slot2", "exercise2", 8, 12, 2.5, 50);
			// Exceeded maxReps
			const log = createLog("slot2", 50, 13, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.type).toBe(ProgressionType.DOUBLE_PROGRESSION);
			if (nextSlot.type === ProgressionType.DOUBLE_PROGRESSION) {
				expect(nextSlot.config.currentLoad).toBe(52.5); // 50 + 2.5
			}
		});

		it("should not change currentLoad when actualReps < maxReps", () => {
			const slot = createDoubleProgressionSlot("slot2", "exercise2", 8, 12, 2.5, 50);
			// Did not hit threshold
			const log = createLog("slot2", 50, 11, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.type).toBe(ProgressionType.DOUBLE_PROGRESSION);
			if (nextSlot.type === ProgressionType.DOUBLE_PROGRESSION) {
				expect(nextSlot.config.currentLoad).toBe(50); // Unchanged
			}
		});

		it("should preserve other config fields when updating currentLoad", () => {
			const slot = createDoubleProgressionSlot("slot2", "exercise2", 8, 12, 2.5, 50);
			const log = createLog("slot2", 50, 12, 8);

			const nextSlot = calculateNextState(slot, log);

			expect(nextSlot.id).toBe("slot2");
			expect(nextSlot.exerciseId).toBe("exercise2");
			if (nextSlot.type === ProgressionType.DOUBLE_PROGRESSION) {
				expect(nextSlot.config.minReps).toBe(8);
				expect(nextSlot.config.maxReps).toBe(12);
				expect(nextSlot.config.increment).toBe(2.5);
			}
		});
	});

	describe("calculateNextState - Backoff Progression", () => {
		it("should return unchanged slot for backoff type", () => {
			const slot = {
				id: "slot3",
				exerciseId: "exercise1",
				type: ProgressionType.LINKED_BACKOFF as const,
				config: {
					parentId: "slot1",
					offsetPercent: -10,
				},
			};
			const log = createLog("slot3", 85, 5, 7);

			const nextSlot = calculateNextState(slot, log);

			// Should return the exact same slot (backoff sets derive from parent)
			expect(nextSlot).toEqual(slot);
		});
	});

	describe("calculateNextState - Validation", () => {
		it("should throw error when log slotId does not match slot id", () => {
			const slot = createRPESlot("slot1", "exercise1", 8, 5, 100);
			const log = createLog("wrongSlotId", 95, 5, 8);

			expect(() => calculateNextState(slot, log)).toThrow(
				"SessionLog slotId (wrongSlotId) does not match ExerciseSlot id (slot1)",
			);
		});
	});
});
