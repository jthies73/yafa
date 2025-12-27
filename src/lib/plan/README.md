# Training Plan Module

A minimal but strictly-typed TypeScript module for managing training plans and session logs in strength training applications.

## Overview

This module differentiates between:
- **Plan (Configuration)**: What weight *should* be used
- **Log (Execution)**: What weight *was actually* used

## Architecture

The module consists of three core files:

### 1. `types.ts` - Type Definitions

Defines the core data structures:

- **ProgressionType** enum with three variants:
  - `RPE_TARGET` - Uses RPE (Rate of Perceived Exertion) to track progress
  - `LINKED_BACKOFF` - Links to a parent exercise with a percentage offset
  - `DOUBLE_PROGRESSION` - Increases weight when hitting rep thresholds

- **ExerciseSlot** - The Plan (discriminated union based on ProgressionType)
- **SessionLog** - The History (records actual performance)

### 2. `factories.ts` - Factory Functions

Helper functions to create properly-typed objects:

- `createRPESlot()` - Creates RPE-based progression slots
- `createBackoffSlot()` - Creates backoff set slots
- `createDoubleProgressionSlot()` - Creates double progression slots
- `createSlot()` - Generic slot creator with overloaded signatures
- `createLog()` - Creates session logs

### 3. `progression.ts` - Logic Engine

Core function:
- `calculateNextState(slot, log)` - Updates the plan based on execution results

**Progression Rules:**
- **RPE**: Updates `currentE1RM` using Brzycki formula based on actual performance
- **Double Progression**: Increases `currentLoad` when `actualReps >= maxReps`
- **Backoff**: Returns unchanged (derives from parent)

## Usage Examples

### Example 1: RPE-Based Progression

```typescript
import { createRPESlot, createLog, calculateNextState } from '@/lib/plan';

// Create a plan for bench press targeting 5 reps at RPE 8
const slot = createRPESlot("slot1", "benchpress", 8, 5, 100);

// Log actual performance: 95kg for 5 reps at RPE 8
const log = createLog("slot1", 95, 5, 8);

// Calculate next state (updates E1RM)
const updatedSlot = calculateNextState(slot, log);
console.log(updatedSlot.config.currentE1RM); // ~114kg
```

### Example 2: Double Progression

```typescript
import { createDoubleProgressionSlot, createLog, calculateNextState } from '@/lib/plan';

// Create a plan: 8-12 reps, increase by 2.5kg when hitting 12
const slot = createDoubleProgressionSlot("slot2", "curl", 8, 12, 2.5, 20);

// Log performance: hit 12 reps at 20kg
const log = createLog("slot2", 20, 12, 8);

// Calculate next state (increases weight)
const updatedSlot = calculateNextState(slot, log);
console.log(updatedSlot.config.currentLoad); // 22.5kg
```

### Example 3: Type-Safe Discriminated Unions

```typescript
import { createSlot, ProgressionType } from '@/lib/plan';

const slot = createSlot("slot3", "squat", ProgressionType.RPE_TARGET, {
  targetRpe: 9,
  targetReps: 3,
  currentE1RM: 150,
});

// Type narrowing works correctly
if (slot.type === ProgressionType.RPE_TARGET) {
  console.log(slot.config.currentE1RM); // TypeScript knows this exists
}
```

## Type Safety

The module uses TypeScript discriminated unions to ensure type safety:

```typescript
type ExerciseSlot =
  | { type: ProgressionType.RPE_TARGET; config: RPEConfig; ... }
  | { type: ProgressionType.LINKED_BACKOFF; config: BackoffConfig; ... }
  | { type: ProgressionType.DOUBLE_PROGRESSION; config: DoubleProgressionConfig; ... }
```

This allows TypeScript to narrow types based on the `type` field, providing compile-time safety.

## Testing

The module includes comprehensive tests:
- 17 test cases covering all functionality
- 93.75% code coverage
- Tests for all three progression types
- Edge case validation

Run tests:
```bash
yarn test src/lib/plan
```

## Integration

The module integrates with the existing `rmCalculator` utility for E1RM calculations using the Brzycki formula.

## API Reference

### Types

- `ProgressionType` - Enum for progression strategies
- `ExerciseSlot` - Plan configuration (discriminated union)
- `SessionLog` - Execution history
- `RPEConfig` - RPE progression configuration
- `BackoffConfig` - Backoff set configuration
- `DoubleProgressionConfig` - Double progression configuration

### Functions

- `createRPESlot(id, exerciseId, targetRpe, targetReps, currentE1RM)`
- `createBackoffSlot(id, exerciseId, parentId, offsetPercent)`
- `createDoubleProgressionSlot(id, exerciseId, minReps, maxReps, increment, currentLoad)`
- `createSlot(id, exerciseId, type, config)` - Generic with overloads
- `createLog(slotId, weight, reps, rpe, date?)` - Date defaults to now
- `calculateNextState(slot, log)` - Updates plan based on execution
