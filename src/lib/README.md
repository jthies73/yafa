# Strength Training Progression Logic

This directory contains the core progression logic for the YAFA strength training application. The system is built with **TypeScript** for type safety and excellent IDE support.

## Architecture

The progression system is organized into three main modules:

### 1. Constants (`constants.ts`)

Defines the progression types and their default settings:

- **RPE_AUTOREG**: Main compound lifts with RPE-based autoregulation
- **LINKED_BACKOFF**: Volume work linked to a top set weight
- **DOUBLE_PROGRESSION**: Accessory work with rep-then-weight progression
- **LINEAR_FIXED**: Beginner-friendly fixed weight increments
- **AMRAP_AUTOREG**: AMRAP sets with bonus rep scaling

### 2. Models (`models.ts`)

Three core data models, all JSON-serializable for IndexedDB storage:

- **ExerciseEntry**: Configuration for a single exercise slot in a routine
- **Routine**: Collection of exercise entries forming a training day
- **WorkoutLog**: Record of a completed set

### 3. Progression Engine (`progression.ts`)

Pure functions for calculating progression:

- `ProgressionCalculator.calculateNextState()`: Main entry point for progression calculations
- `calculateE1RM()`: Brzycki formula with RPE adjustment
- `calculateBackoff()`: Real-time backoff set weight calculation

## Quick Start

```typescript
import { ProgressionType } from './constants';
import { ExerciseEntry, WorkoutLog } from './models';
import { ProgressionCalculator } from './progression';

// 1. Create an exercise entry
const squat = new ExerciseEntry({
  id: 'squat-1',
  exerciseId: 'barbell-squat',
  progressionType: ProgressionType.RPE_AUTOREG,
  targetRpe: 8,
  targetReps: 5,
  currentWeight: 100,
});

// 2. Log a workout
const log = new WorkoutLog({
  id: 'log-1',
  entryId: 'squat-1',
  date: new Date().toISOString(),
  actualReps: 5,
  actualWeight: 100,
  actualRpe: 7.5, // Easier than target
});

// 3. Calculate next session
const next = ProgressionCalculator.calculateNextState(squat, [log]);
console.log(`Next weight: ${next.nextWeight}kg`);
// Output: Next weight: 102.5kg (increased because RPE was below target)
```

## Progression Types Explained

### RPE Autoregulation

Used for main compound lifts. Weight adjusts based on perceived difficulty:

- **RPE < Target**: Increase weight
- **RPE ≈ Target**: Maintain weight
- **RPE > Target**: Flag for review (no auto-reduction)

```javascript
const entry = new ExerciseEntry({
  progressionType: ProgressionType.RPE_AUTOREG,
  targetRpe: 8,
  targetReps: 5,
  settings: {
    incrementOnSuccess: 2.5,
    rpeTolerance: 0.5,
  },
});
```

### Linked Backoff

Volume work calculated as a percentage of the top set:

```javascript
const backoff = new ExerciseEntry({
  progressionType: ProgressionType.LINKED_BACKOFF,
  parentEntryId: 'main-squat-id',
  settings: {
    offsetPct: -0.10, // 10% lighter
  },
});

// During workout:
const backoffWeight = calculateBackoff(140, backoff.settings);
// Returns: 126kg (90% of 140kg)
```

### Double Progression

Increase reps until ceiling, then increase weight and reset:

```javascript
const curl = new ExerciseEntry({
  progressionType: ProgressionType.DOUBLE_PROGRESSION,
  currentWeight: 20,
  currentReps: 8,
  settings: {
    repFloor: 8,
    repCeiling: 12,
    weightIncrement: 2.5,
  },
});

// Progression: 8→9→10→11→12 reps, then increase weight and back to 8
```

### Linear Fixed

Simple fixed weight addition on successful completion:

```javascript
const entry = new ExerciseEntry({
  progressionType: ProgressionType.LINEAR_FIXED,
  targetReps: 5,
  settings: {
    fixedIncrement: 2.5,
    targetSets: 3,
  },
});

// Complete 3 sets of 5 → add 2.5kg next session
```

### AMRAP Autoregulation

Weight increase scales with bonus reps performed:

```javascript
const entry = new ExerciseEntry({
  progressionType: ProgressionType.AMRAP_AUTOREG,
  settings: {
    minReps: 5,
    incrementPerBonusRep: 2.5,
    maxIncrement: 10,
  },
});

// Hit 8 reps (3 bonus) → increase by 7.5kg (3 × 2.5kg)
```

## IndexedDB Integration

All models provide `toJSON()` and `fromJSON()` methods for seamless storage:

```javascript
// Save to IndexedDB
const entry = new ExerciseEntry({...});
const json = entry.toJSON();
await db.exercises.add(json);

// Load from IndexedDB
const data = await db.exercises.get(id);
const entry = ExerciseEntry.fromJSON(data);
```

## Testing

Comprehensive test suite with 84 tests covering:

- Constants and enums
- Model creation and validation
- JSON serialization/deserialization
- All progression algorithms
- Edge cases and error handling

Run tests:

```bash
yarn test
```

## Examples

See `examples.js` for complete working examples of each progression type.

Run examples:

```bash
node src/lib/examples.js
```

## Design Principles

1. **Pure Functions**: All progression logic is deterministic and side-effect free
2. **JSON-Friendly**: All data structures serialize cleanly for IndexedDB
3. **Extensive JSDoc**: Complete type information for IDE support
4. **Validation**: Built-in validation for all models
5. **Flexibility**: Settings objects allow per-exercise customization

## Future Considerations

- Support for deload protocols
- Periodization schemes (linear, undulating, block)
- Autoregulation based on velocity/bar speed
- Integration with wearable fatigue metrics
- Historical analysis and trend visualization
