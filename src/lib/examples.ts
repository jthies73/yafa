/**
 * @fileoverview Example usage of the progression logic system.
 * 
 * This file demonstrates how to use the constants, models, and progression
 * calculator to implement a complete strength training progression workflow.
 */

import { ProgressionType } from './constants';
import { ExerciseEntry, Routine, WorkoutLog } from './models';
import { ProgressionCalculator, calculateBackoff } from './progression';

/**
 * Example 1: RPE-based Autoregulation for Main Lifts
 * 
 * This example shows how to set up a squat progression using RPE autoregulation.
 */
export function exampleRpeAutoregulation() {
	// 1. Create an exercise entry for the main squat work
	const squatEntry = new ExerciseEntry({
		id: 'squat-main-1',
		exerciseId: 'barbell-squat',
		progressionType: ProgressionType.RPE_AUTOREG,
		targetRpe: 8,
		targetReps: 5,
		currentWeight: 100,
		settings: {
			incrementOnSuccess: 2.5,
			rpeTolerance: 0.5,
		},
	});

	// 2. Log a workout where the lifter performed well (RPE was easier than expected)
	const workoutLog = new WorkoutLog({
		id: 'log-001',
		entryId: 'squat-main-1',
		date: new Date().toISOString(),
		actualReps: 5,
		actualWeight: 100,
		actualRpe: 7.5, // Target was 8, but felt like 7.5
	});

	// 3. Calculate what to do next session
	const nextState = ProgressionCalculator.calculateNextState(squatEntry, [workoutLog]);

	console.log('RPE Autoregulation Example:');
	console.log(`Next Weight: ${nextState.nextWeight}kg`);
	console.log(`Message: ${nextState.message}`);
	console.log(`Needs Review: ${nextState.needsReview}`);
	// Output: Next Weight: 102.5kg (increased because RPE was below target)

	return nextState;
}

/**
 * Example 2: Linked Backoff Sets
 * 
 * This example shows how to calculate backoff set weights in real-time.
 */
export function exampleLinkedBackoff() {
	// 1. Lifter just completed their top set at 140kg
	const topSetWeight = 140;

	// 2. Create a backoff entry configuration
	const backoffEntry = new ExerciseEntry({
		id: 'squat-backoff-1',
		exerciseId: 'barbell-squat',
		progressionType: ProgressionType.LINKED_BACKOFF,
		parentEntryId: 'squat-main-1',
		settings: {
			offsetPct: -0.10, // 10% lighter than top set
		},
	});

	// 3. Calculate the backoff weight immediately
	const backoffWeight = calculateBackoff(topSetWeight, backoffEntry.settings as { offsetPct: number });

	console.log('\nLinked Backoff Example:');
	console.log(`Top Set: ${topSetWeight}kg`);
	console.log(`Backoff Sets: ${backoffWeight}kg (90% of top set)`);
	// Output: Backoff Sets: 126kg

	return backoffWeight;
}

/**
 * Example 3: Double Progression for Accessories
 * 
 * This example shows how to progress accessory exercises using double progression.
 */
export function exampleDoubleProgression() {
	// 1. Create an entry for dumbbell curls with 8-12 rep range
	const curlEntry = new ExerciseEntry({
		id: 'db-curl-1',
		exerciseId: 'dumbbell-curl',
		progressionType: ProgressionType.DOUBLE_PROGRESSION,
		currentWeight: 20,
		currentReps: 10, // Currently working with 10 reps
		settings: {
			repFloor: 8,
			repCeiling: 12,
			weightIncrement: 2.5,
		},
	});

	// 2. Log a successful workout where all reps were completed
	const workoutLog = new WorkoutLog({
		id: 'log-002',
		entryId: 'db-curl-1',
		date: new Date().toISOString(),
		actualReps: 10,
		actualWeight: 20,
	});

	// 3. Calculate progression
	const nextState = ProgressionCalculator.calculateNextState(curlEntry, [workoutLog]);

	console.log('\nDouble Progression Example:');
	console.log(`Current: ${curlEntry.currentWeight}kg x ${curlEntry.currentReps} reps`);
	console.log(`Next: ${nextState.nextWeight}kg x ${nextState.nextReps} reps`);
	console.log(`Message: ${nextState.message}`);
	// Output: Next: 20kg x 11 reps (increased reps, still below ceiling)

	return nextState;
}

/**
 * Example 4: Complete Routine with Multiple Exercises
 * 
 * This example shows how to build a complete training routine.
 */
export function exampleCompleteRoutine() {
	// 1. Create multiple exercise entries
	const squatMain = new ExerciseEntry({
		id: 'upper-a-squat-main',
		exerciseId: 'barbell-squat',
		progressionType: ProgressionType.RPE_AUTOREG,
		targetRpe: 8,
		targetReps: 5,
		currentWeight: 100,
	});

	const squatBackoff = new ExerciseEntry({
		id: 'upper-a-squat-backoff',
		exerciseId: 'barbell-squat',
		progressionType: ProgressionType.LINKED_BACKOFF,
		parentEntryId: 'upper-a-squat-main',
		settings: { offsetPct: -0.10 },
	});

	const legPress = new ExerciseEntry({
		id: 'upper-a-leg-press',
		exerciseId: 'leg-press',
		progressionType: ProgressionType.DOUBLE_PROGRESSION,
		currentWeight: 180,
		currentReps: 8,
		settings: { repFloor: 8, repCeiling: 12 },
	});

	// 2. Create a routine to organize them
	const routine = new Routine({
		id: 'lower-a',
		name: 'Lower Body A',
		entryIds: [squatMain.id, squatBackoff.id, legPress.id],
		metadata: {
			frequency: 'Twice per week',
			notes: 'Focus on squat volume and leg press hypertrophy',
		},
	});

	console.log('\nComplete Routine Example:');
	console.log(`Routine: ${routine.name}`);
	console.log(`Exercises: ${routine.entryIds.length}`);
	console.log('Entry IDs:', routine.entryIds);

	// 3. Demonstrate JSON serialization (for IndexedDB storage)
	const routineJson = routine.toJSON();
	const restored = Routine.fromJSON(routineJson);
	console.log('\nSerialization test passed:', restored.id === routine.id);

	return routine;
}

/**
 * Example 5: AMRAP Progression
 * 
 * This example shows how to progress using AMRAP sets with bonus reps.
 */
export function exampleAmrapProgression() {
	const deadliftEntry = new ExerciseEntry({
		id: 'deadlift-amrap',
		exerciseId: 'deadlift',
		progressionType: ProgressionType.AMRAP_AUTOREG,
		currentWeight: 140,
		settings: {
			minReps: 5,
			incrementPerBonusRep: 2.5,
			maxIncrement: 10,
		},
	});

	// Lifter hit 8 reps (3 bonus reps beyond the minimum 5)
	const workoutLog = new WorkoutLog({
		id: 'log-003',
		entryId: 'deadlift-amrap',
		date: new Date().toISOString(),
		actualReps: 8,
		actualWeight: 140,
		bonusReps: 3,
	});

	const nextState = ProgressionCalculator.calculateNextState(deadliftEntry, [workoutLog]);

	console.log('\nAMRAP Progression Example:');
	console.log(`Performed: ${workoutLog.actualReps} reps (${workoutLog.bonusReps} bonus)`);
	console.log(`Next Weight: ${nextState.nextWeight}kg`);
	console.log(`Increment: ${nextState.nextWeight - deadliftEntry.currentWeight}kg`);
	// Output: Next Weight: 147.5kg (increased by 3 bonus × 2.5kg)

	return nextState;
}

// Run all examples if this file is executed directly (Node.js only)
// Note: This is a simple check and may not work in all environments
try {
	if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
		console.log('=== Progression Logic Examples ===\n');
		exampleRpeAutoregulation();
		exampleLinkedBackoff();
		exampleDoubleProgression();
		exampleCompleteRoutine();
		exampleAmrapProgression();
		console.log('\n=== All examples completed ===');
	}
} catch {
	// Ignore errors in detection - this is just a convenience feature
}
