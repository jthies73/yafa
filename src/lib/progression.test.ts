import { describe, expect, it } from '@jest/globals';

import { ProgressionType, ProgressionTypeValue } from './constants';
import { ExerciseEntry, WorkoutLog } from './models';
import { ProgressionCalculator, calculateBackoff, calculateE1RM } from './progression';

describe('ProgressionCalculator - calculateE1RM', () => {
	it('should calculate E1RM using Brzycki formula', () => {
		// Test case: 100kg x 5 reps @ RPE 8
		// Effective reps = 5 + (10 - 8) = 7
		// E1RM = 100 * (36 / (37 - 7)) = 100 * (36 / 30) = 120
		const e1rm = ProgressionCalculator.calculateE1RM(100, 5, 8);
		expect(e1rm).toBeCloseTo(120, 1);
	});

	it('should handle RPE 10 (no reps in reserve)', () => {
		// RPE 10 means effective reps = actual reps
		const e1rm = ProgressionCalculator.calculateE1RM(100, 1, 10);
		expect(e1rm).toBeCloseTo(100, 1); // Should be ~100 for a true 1RM
	});

	it('should handle RPE 9 correctly', () => {
		// 100kg x 5 @ RPE 9 = effective reps 6
		// E1RM = 100 * (36 / (37 - 6)) = 100 * (36 / 31) ≈ 116.13
		const e1rm = ProgressionCalculator.calculateE1RM(100, 5, 9);
		expect(e1rm).toBeGreaterThan(115);
		expect(e1rm).toBeLessThan(117);
	});

	it('should handle high rep sets conservatively', () => {
		// For very high reps, use conservative estimate
		const e1rm = ProgressionCalculator.calculateE1RM(50, 40, 10);
		expect(e1rm).toBeGreaterThan(50);
		expect(e1rm).toBeDefined();
	});

	it('should be accessible via standalone function', () => {
		const e1rm1 = ProgressionCalculator.calculateE1RM(100, 5, 8);
		const e1rm2 = calculateE1RM(100, 5, 8);
		expect(e1rm1).toBe(e1rm2);
	});
});

describe('ProgressionCalculator - calculateBackoff', () => {
	it('should calculate backoff weight with negative offset', () => {
		const backoff = ProgressionCalculator.calculateBackoff(100, { offsetPct: -0.10 });
		expect(backoff).toBe(90);
	});

	it('should calculate backoff weight with positive offset', () => {
		const backoff = ProgressionCalculator.calculateBackoff(100, { offsetPct: 0.05 });
		expect(backoff).toBe(105);
	});

	it('should handle zero offset', () => {
		const backoff = ProgressionCalculator.calculateBackoff(100, { offsetPct: 0 });
		expect(backoff).toBe(100);
	});

	it('should round to 2 decimal places', () => {
		const backoff = ProgressionCalculator.calculateBackoff(100, { offsetPct: -0.123 });
		expect(backoff).toBe(87.7);
	});

	it('should be accessible via standalone function', () => {
		const backoff1 = ProgressionCalculator.calculateBackoff(100, { offsetPct: -0.10 });
		const backoff2 = calculateBackoff(100, { offsetPct: -0.10 });
		expect(backoff1).toBe(backoff2);
	});
});

describe('ProgressionCalculator - RPE_AUTOREG', () => {
	it('should maintain weight when RPE is on target', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.RPE_AUTOREG,
			targetRpe: 8,
			targetReps: 5,
			currentWeight: 100,
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 100,
			actualRpe: 8,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(100);
		expect(result.needsReview).toBe(false);
	});

	it('should increase weight when RPE is below target', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.RPE_AUTOREG,
			targetRpe: 8,
			targetReps: 5,
			currentWeight: 100,
			settings: { incrementOnSuccess: 2.5 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 100,
			actualRpe: 7,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(102.5);
		expect(result.needsReview).toBe(false);
	});

	it('should flag for review when RPE exceeds target', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.RPE_AUTOREG,
			targetRpe: 8,
			targetReps: 5,
			currentWeight: 100,
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 100,
			actualRpe: 9,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(100); // Should not auto-reduce
		expect(result.needsReview).toBe(true);
	});

	it('should flag for review when RPE is not recorded', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.RPE_AUTOREG,
			targetRpe: 8,
			targetReps: 5,
			currentWeight: 100,
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 100,
			actualRpe: null,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.needsReview).toBe(true);
	});
});

describe('ProgressionCalculator - DOUBLE_PROGRESSION', () => {
	it('should increase reps when below ceiling', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'curl',
			progressionType: ProgressionType.DOUBLE_PROGRESSION,
			currentWeight: 20,
			currentReps: 8,
			settings: { repFloor: 8, repCeiling: 12 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 8,
			actualWeight: 20,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(20);
		expect(result.nextReps).toBe(9);
		expect(result.needsReview).toBe(false);
	});

	it('should increase weight and reset reps when ceiling is reached', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'curl',
			progressionType: ProgressionType.DOUBLE_PROGRESSION,
			currentWeight: 20,
			currentReps: 12,
			settings: { repFloor: 8, repCeiling: 12, weightIncrement: 2.5 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 12,
			actualWeight: 20,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(22.5);
		expect(result.nextReps).toBe(8);
		expect(result.needsReview).toBe(false);
	});

	it('should maintain when reps are not completed', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'curl',
			progressionType: ProgressionType.DOUBLE_PROGRESSION,
			currentWeight: 20,
			currentReps: 10,
			settings: { repFloor: 8, repCeiling: 12 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 8, // Failed to complete 10
			actualWeight: 20,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(20);
		expect(result.nextReps).toBe(10);
		expect(result.needsReview).toBe(false);
	});
});

describe('ProgressionCalculator - LINEAR_FIXED', () => {
	it('should increase weight when all sets are completed', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.LINEAR_FIXED,
			currentWeight: 100,
			targetReps: 5,
			settings: { fixedIncrement: 2.5, targetSets: 3 },
		});

		const logs = [
			new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				completed: true,
			}),
			new WorkoutLog({
				id: 'log-2',
				entryId: 'entry-1',
				date: '2024-01-01T10:05:00Z',
				actualReps: 5,
				actualWeight: 100,
				completed: true,
			}),
			new WorkoutLog({
				id: 'log-3',
				entryId: 'entry-1',
				date: '2024-01-01T10:10:00Z',
				actualReps: 5,
				actualWeight: 100,
				completed: true,
			}),
		];

		const result = ProgressionCalculator.calculateNextState(entry, logs);
		expect(result.nextWeight).toBe(102.5);
		expect(result.needsReview).toBe(false);
	});

	it('should maintain weight when not all sets are completed', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.LINEAR_FIXED,
			currentWeight: 100,
			targetReps: 5,
			settings: { fixedIncrement: 2.5, targetSets: 3 },
		});

		const logs = [
			new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				completed: true,
			}),
			new WorkoutLog({
				id: 'log-2',
				entryId: 'entry-1',
				date: '2024-01-01T10:05:00Z',
				actualReps: 4, // Failed this set
				actualWeight: 100,
				completed: false,
			}),
		];

		const result = ProgressionCalculator.calculateNextState(entry, logs);
		expect(result.nextWeight).toBe(100);
		expect(result.needsReview).toBe(false);
	});
});

describe('ProgressionCalculator - AMRAP_AUTOREG', () => {
	it('should increase weight based on bonus reps', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.AMRAP_AUTOREG,
			currentWeight: 100,
			settings: { minReps: 5, incrementPerBonusRep: 2.5, maxIncrement: 10 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 8, // 3 bonus reps
			actualWeight: 100,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(107.5); // 100 + (3 * 2.5)
		expect(result.needsReview).toBe(false);
	});

	it('should cap weight increase at maxIncrement', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.AMRAP_AUTOREG,
			currentWeight: 100,
			settings: { minReps: 5, incrementPerBonusRep: 2.5, maxIncrement: 10 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 15, // 10 bonus reps = 25kg, but capped at 10kg
			actualWeight: 100,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(110); // 100 + 10 (capped)
		expect(result.needsReview).toBe(false);
	});

	it('should flag for review when minimum reps not met', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.AMRAP_AUTOREG,
			currentWeight: 100,
			settings: { minReps: 5 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 3, // Below minimum
			actualWeight: 100,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.needsReview).toBe(true);
	});

	it('should use explicit bonusReps if provided', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.AMRAP_AUTOREG,
			currentWeight: 100,
			settings: { minReps: 5, incrementPerBonusRep: 2.5 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 8,
			actualWeight: 100,
			bonusReps: 2, // Explicit bonus reps
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(105); // 100 + (2 * 2.5)
	});
});

describe('ProgressionCalculator - LINKED_BACKOFF', () => {
	it('should return message for LINKED_BACKOFF progression', () => {
		const entry = new ExerciseEntry({
			id: 'entry-2',
			exerciseId: 'squat-backoff',
			progressionType: ProgressionType.LINKED_BACKOFF,
			parentEntryId: 'entry-1',
			currentWeight: 90,
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-2',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 90,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(90);
		expect(result.message).toContain('real-time');
	});
});

describe('ProgressionCalculator - Edge Cases', () => {
	it('should handle empty logs array', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.RPE_AUTOREG,
			currentWeight: 100,
		});

		const result = ProgressionCalculator.calculateNextState(entry, []);
		expect(result.nextWeight).toBe(100);
		expect(result.message).toContain('No logs');
	});

	it('should handle null logs', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.RPE_AUTOREG,
			currentWeight: 100,
		});

		const result = ProgressionCalculator.calculateNextState(entry, null);
		expect(result.nextWeight).toBe(100);
	});

	it('should handle unknown progression type', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: 'UNKNOWN_TYPE' as unknown as ProgressionTypeValue,
			currentWeight: 100,
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 100,
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.needsReview).toBe(true);
		expect(result.message).toContain('Unknown');
	});

	it('should handle bonusReps explicitly set to 0', () => {
		const entry = new ExerciseEntry({
			id: 'entry-1',
			exerciseId: 'squat',
			progressionType: ProgressionType.AMRAP_AUTOREG,
			currentWeight: 100,
			settings: { minReps: 5, incrementPerBonusRep: 2.5 },
		});

		const log = new WorkoutLog({
			id: 'log-1',
			entryId: 'entry-1',
			date: '2024-01-01T10:00:00Z',
			actualReps: 5,
			actualWeight: 100,
			bonusReps: 0, // Explicitly 0, not null
		});

		const result = ProgressionCalculator.calculateNextState(entry, [log]);
		expect(result.nextWeight).toBe(100); // No increase with 0 bonus reps
		expect(result.needsReview).toBe(false);
	});
});
