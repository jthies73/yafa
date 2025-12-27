import { describe, expect, it } from "@jest/globals";

import {
	createBackoffSlot,
	createDoubleProgressionSlot,
	createLog,
	createRPESlot,
	createSlot,
} from "./factories";
import { ProgressionType } from "./types";

describe("Factory Functions", () => {
	describe("createRPESlot", () => {
		it("should create an RPE slot with correct structure", () => {
			const slot = createRPESlot("slot1", "exercise1", 8, 5, 100);

			expect(slot.id).toBe("slot1");
			expect(slot.exerciseId).toBe("exercise1");
			expect(slot.type).toBe(ProgressionType.RPE_TARGET);
			expect(slot.config).toEqual({
				targetRpe: 8,
				targetReps: 5,
				currentE1RM: 100,
			});
		});
	});

	describe("createBackoffSlot", () => {
		it("should create a backoff slot with correct structure", () => {
			const slot = createBackoffSlot("slot2", "exercise1", "slot1", -10);

			expect(slot.id).toBe("slot2");
			expect(slot.exerciseId).toBe("exercise1");
			expect(slot.type).toBe(ProgressionType.LINKED_BACKOFF);
			expect(slot.config).toEqual({
				parentId: "slot1",
				offsetPercent: -10,
			});
		});
	});

	describe("createDoubleProgressionSlot", () => {
		it("should create a double progression slot with correct structure", () => {
			const slot = createDoubleProgressionSlot("slot3", "exercise2", 8, 12, 2.5, 50);

			expect(slot.id).toBe("slot3");
			expect(slot.exerciseId).toBe("exercise2");
			expect(slot.type).toBe(ProgressionType.DOUBLE_PROGRESSION);
			expect(slot.config).toEqual({
				minReps: 8,
				maxReps: 12,
				increment: 2.5,
				currentLoad: 50,
			});
		});
	});

	describe("createSlot (generic)", () => {
		it("should create an RPE slot when given RPE config", () => {
			const slot = createSlot("slot1", "exercise1", ProgressionType.RPE_TARGET, {
				targetRpe: 8,
				targetReps: 5,
				currentE1RM: 100,
			});

			expect(slot.type).toBe(ProgressionType.RPE_TARGET);
			if (slot.type === ProgressionType.RPE_TARGET) {
				expect(slot.config.currentE1RM).toBe(100);
			}
		});

		it("should create a backoff slot when given backoff config", () => {
			const slot = createSlot("slot2", "exercise1", ProgressionType.LINKED_BACKOFF, {
				parentId: "slot1",
				offsetPercent: -10,
			});

			expect(slot.type).toBe(ProgressionType.LINKED_BACKOFF);
			if (slot.type === ProgressionType.LINKED_BACKOFF) {
				expect(slot.config.parentId).toBe("slot1");
			}
		});

		it("should create a double progression slot when given double progression config", () => {
			const slot = createSlot("slot3", "exercise2", ProgressionType.DOUBLE_PROGRESSION, {
				minReps: 8,
				maxReps: 12,
				increment: 2.5,
				currentLoad: 50,
			});

			expect(slot.type).toBe(ProgressionType.DOUBLE_PROGRESSION);
			if (slot.type === ProgressionType.DOUBLE_PROGRESSION) {
				expect(slot.config.currentLoad).toBe(50);
			}
		});
	});

	describe("createLog", () => {
		it("should create a session log with provided date", () => {
			const date = new Date("2024-01-15");
			const log = createLog("slot1", 100, 5, 8, date);

			expect(log.slotId).toBe("slot1");
			expect(log.date).toBe(date);
			expect(log.actualWeight).toBe(100);
			expect(log.actualReps).toBe(5);
			expect(log.actualRPE).toBe(8);
		});

		it("should create a session log with current date when date not provided", () => {
			const beforeTime = new Date().getTime();
			const log = createLog("slot1", 100, 5, 8);
			const afterTime = new Date().getTime();

			expect(log.slotId).toBe("slot1");
			expect(log.date.getTime()).toBeGreaterThanOrEqual(beforeTime);
			expect(log.date.getTime()).toBeLessThanOrEqual(afterTime);
			expect(log.actualWeight).toBe(100);
			expect(log.actualReps).toBe(5);
			expect(log.actualRPE).toBe(8);
		});
	});
});
