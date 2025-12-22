import { describe, expect, it } from '@jest/globals';

import { ProgressionType } from './constants.js';
import { ExerciseEntry, Routine, WorkoutLog } from './models.js';

describe('ExerciseEntry', () => {
	describe('constructor', () => {
		it('should create a valid entry with all required fields', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetRpe: 8,
				targetReps: 5,
				currentWeight: 100,
			});

			expect(entry.id).toBe('entry-1');
			expect(entry.exerciseId).toBe('squat');
			expect(entry.progressionType).toBe(ProgressionType.RPE_AUTOREG);
			expect(entry.targetRpe).toBe(8);
			expect(entry.targetReps).toBe(5);
			expect(entry.currentWeight).toBe(100);
		});

		it('should merge custom settings with defaults', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				settings: { incrementOnSuccess: 5 },
			});

			expect(entry.settings.incrementOnSuccess).toBe(5);
			expect(entry.settings.targetRpe).toBeDefined(); // Should have default
			expect(entry.settings.rpeTolerance).toBeDefined(); // Should have default
		});

		it('should use default values for optional fields', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
			});

			expect(entry.targetRpe).toBeNull();
			expect(entry.targetReps).toBeNull();
			expect(entry.currentWeight).toBe(0);
			expect(entry.currentReps).toBeNull();
			expect(entry.parentEntryId).toBeNull();
			expect(entry.metadata).toEqual({});
		});

		it('should store parent entry ID for LINKED_BACKOFF', () => {
			const entry = new ExerciseEntry({
				id: 'entry-2',
				exerciseId: 'squat-backoff',
				progressionType: ProgressionType.LINKED_BACKOFF,
				parentEntryId: 'entry-1',
			});

			expect(entry.parentEntryId).toBe('entry-1');
		});
	});

	describe('validate', () => {
		it('should validate a correct RPE_AUTOREG entry', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetRpe: 8,
				targetReps: 5,
			});

			const result = entry.validate();
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should fail validation for RPE_AUTOREG without targetRpe', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetReps: 5,
			});

			const result = entry.validate();
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should fail validation for RPE_AUTOREG with invalid RPE', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetRpe: 5, // Too low (should be 6-10)
				targetReps: 5,
			});

			const result = entry.validate();
			expect(result.valid).toBe(false);
		});

		it('should validate a correct LINKED_BACKOFF entry', () => {
			const entry = new ExerciseEntry({
				id: 'entry-2',
				exerciseId: 'squat-backoff',
				progressionType: ProgressionType.LINKED_BACKOFF,
				parentEntryId: 'entry-1',
				settings: { offsetPct: -0.10 },
			});

			const result = entry.validate();
			expect(result.valid).toBe(true);
		});

		it('should fail validation for LINKED_BACKOFF without parentEntryId', () => {
			const entry = new ExerciseEntry({
				id: 'entry-2',
				exerciseId: 'squat-backoff',
				progressionType: ProgressionType.LINKED_BACKOFF,
			});

			const result = entry.validate();
			expect(result.valid).toBe(false);
		});

		it('should validate a correct DOUBLE_PROGRESSION entry', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'curl',
				progressionType: ProgressionType.DOUBLE_PROGRESSION,
				currentReps: 8,
			});

			const result = entry.validate();
			expect(result.valid).toBe(true);
		});

		it('should fail validation for DOUBLE_PROGRESSION with invalid rep range', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'curl',
				progressionType: ProgressionType.DOUBLE_PROGRESSION,
				settings: { repFloor: 12, repCeiling: 8 }, // Floor > ceiling
			});

			const result = entry.validate();
			expect(result.valid).toBe(false);
		});

		it('should fail validation without id', () => {
			const entry = new ExerciseEntry({
				exerciseId: 'squat',
				progressionType: ProgressionType.LINEAR_FIXED,
			});
			entry.id = null;

			const result = entry.validate();
			expect(result.valid).toBe(false);
			expect(result.errors.some(e => e.includes('id'))).toBe(true);
		});

		it('should fail validation with invalid progression type', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: 'INVALID_TYPE',
			});

			const result = entry.validate();
			expect(result.valid).toBe(false);
		});
	});

	describe('toJSON and fromJSON', () => {
		it('should serialize to JSON correctly', () => {
			const entry = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetRpe: 8,
				targetReps: 5,
				currentWeight: 100,
				metadata: { notes: 'Test note' },
			});

			const json = entry.toJSON();
			expect(json.id).toBe('entry-1');
			expect(json.exerciseId).toBe('squat');
			expect(json.progressionType).toBe(ProgressionType.RPE_AUTOREG);
			expect(json.targetRpe).toBe(8);
			expect(json.targetReps).toBe(5);
			expect(json.currentWeight).toBe(100);
			expect(json.metadata.notes).toBe('Test note');
		});

		it('should deserialize from JSON correctly', () => {
			const data = {
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetRpe: 8,
				targetReps: 5,
				currentWeight: 100,
			};

			const entry = ExerciseEntry.fromJSON(data);
			expect(entry).toBeInstanceOf(ExerciseEntry);
			expect(entry.id).toBe('entry-1');
			expect(entry.exerciseId).toBe('squat');
			expect(entry.progressionType).toBe(ProgressionType.RPE_AUTOREG);
		});

		it('should round-trip through JSON correctly', () => {
			const original = new ExerciseEntry({
				id: 'entry-1',
				exerciseId: 'squat',
				progressionType: ProgressionType.RPE_AUTOREG,
				targetRpe: 8,
				targetReps: 5,
			});

			const json = original.toJSON();
			const restored = ExerciseEntry.fromJSON(json);

			expect(restored.id).toBe(original.id);
			expect(restored.exerciseId).toBe(original.exerciseId);
			expect(restored.progressionType).toBe(original.progressionType);
		});
	});
});

describe('Routine', () => {
	describe('constructor', () => {
		it('should create a valid routine', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
				entryIds: ['entry-1', 'entry-2'],
			});

			expect(routine.id).toBe('routine-1');
			expect(routine.name).toBe('Upper A');
			expect(routine.entryIds).toEqual(['entry-1', 'entry-2']);
		});

		it('should use default values for optional fields', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
			});

			expect(routine.entryIds).toEqual([]);
			expect(routine.metadata).toEqual({});
		});
	});

	describe('addEntry', () => {
		it('should add an entry ID', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
			});

			routine.addEntry('entry-1');
			expect(routine.entryIds).toContain('entry-1');
		});

		it('should not add duplicate entry IDs', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
			});

			routine.addEntry('entry-1');
			routine.addEntry('entry-1');
			expect(routine.entryIds.length).toBe(1);
		});
	});

	describe('removeEntry', () => {
		it('should remove an entry ID', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
				entryIds: ['entry-1', 'entry-2'],
			});

			routine.removeEntry('entry-1');
			expect(routine.entryIds).not.toContain('entry-1');
			expect(routine.entryIds).toContain('entry-2');
		});

		it('should handle removing non-existent entry', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
				entryIds: ['entry-1'],
			});

			routine.removeEntry('entry-2');
			expect(routine.entryIds).toEqual(['entry-1']);
		});
	});

	describe('toJSON and fromJSON', () => {
		it('should serialize to JSON correctly', () => {
			const routine = new Routine({
				id: 'routine-1',
				name: 'Upper A',
				entryIds: ['entry-1', 'entry-2'],
			});

			const json = routine.toJSON();
			expect(json.id).toBe('routine-1');
			expect(json.name).toBe('Upper A');
			expect(json.entryIds).toEqual(['entry-1', 'entry-2']);
		});

		it('should deserialize from JSON correctly', () => {
			const data = {
				id: 'routine-1',
				name: 'Upper A',
				entryIds: ['entry-1', 'entry-2'],
			};

			const routine = Routine.fromJSON(data);
			expect(routine).toBeInstanceOf(Routine);
			expect(routine.id).toBe('routine-1');
			expect(routine.name).toBe('Upper A');
		});
	});
});

describe('WorkoutLog', () => {
	describe('constructor', () => {
		it('should create a valid workout log', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				actualRpe: 8,
			});

			expect(log.id).toBe('log-1');
			expect(log.entryId).toBe('entry-1');
			expect(log.date).toBe('2024-01-01T10:00:00Z');
			expect(log.actualReps).toBe(5);
			expect(log.actualWeight).toBe(100);
			expect(log.actualRpe).toBe(8);
		});

		it('should use default values for optional fields', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
			});

			expect(log.actualRpe).toBeNull();
			expect(log.bonusReps).toBeNull();
			expect(log.completed).toBe(true);
			expect(log.metadata).toEqual({});
		});
	});

	describe('validate', () => {
		it('should validate a correct log', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
			});

			const result = log.validate();
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should fail validation without required fields', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
			});
			log.id = null;

			const result = log.validate();
			expect(result.valid).toBe(false);
		});

		it('should fail validation with negative reps', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: -1,
				actualWeight: 100,
			});

			const result = log.validate();
			expect(result.valid).toBe(false);
		});

		it('should fail validation with invalid RPE', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				actualRpe: 11, // Too high
			});

			const result = log.validate();
			expect(result.valid).toBe(false);
		});

		it('should allow null RPE', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				actualRpe: null,
			});

			const result = log.validate();
			expect(result.valid).toBe(true);
		});
	});

	describe('toJSON and fromJSON', () => {
		it('should serialize to JSON correctly', () => {
			const log = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				actualRpe: 8,
				bonusReps: 2,
			});

			const json = log.toJSON();
			expect(json.id).toBe('log-1');
			expect(json.entryId).toBe('entry-1');
			expect(json.date).toBe('2024-01-01T10:00:00Z');
			expect(json.actualReps).toBe(5);
			expect(json.actualWeight).toBe(100);
			expect(json.actualRpe).toBe(8);
			expect(json.bonusReps).toBe(2);
		});

		it('should deserialize from JSON correctly', () => {
			const data = {
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
			};

			const log = WorkoutLog.fromJSON(data);
			expect(log).toBeInstanceOf(WorkoutLog);
			expect(log.id).toBe('log-1');
			expect(log.actualReps).toBe(5);
		});

		it('should round-trip through JSON correctly', () => {
			const original = new WorkoutLog({
				id: 'log-1',
				entryId: 'entry-1',
				date: '2024-01-01T10:00:00Z',
				actualReps: 5,
				actualWeight: 100,
				actualRpe: 8,
			});

			const json = original.toJSON();
			const restored = WorkoutLog.fromJSON(json);

			expect(restored.id).toBe(original.id);
			expect(restored.entryId).toBe(original.entryId);
			expect(restored.actualReps).toBe(original.actualReps);
			expect(restored.actualWeight).toBe(original.actualWeight);
			expect(restored.actualRpe).toBe(original.actualRpe);
		});
	});
});
