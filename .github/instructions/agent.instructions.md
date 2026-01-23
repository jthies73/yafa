# YAFA – Architectural Instructions

> **Source of Truth** for all developers and AI agents working on this project.

---

## Project Overview

Yet Another Fitness App is a gym companion tool designed to provide a flexible framework for tracking progress and managing training variables. Its primary goal is to facilitate **progressive overload** through user-created plans that incorporate **periodization** and **autoregulation**.

The app currently features a built-in calculator to derive working weights from target reps and RPE inputs.

---

## Tech Stack

| Layer                | Technology               | Status          |
| -------------------- | ------------------------ | --------------- |
| UI Framework         | React 19 + TypeScript    | ✅ Current      |
| Build Tool           | Vite                     | ✅ Current      |
| Styling              | Tailwind CSS + Radix UI  | ✅ Current      |
| State Management     | Zustand                  | ⏳ Transitional |
| Persistence          | LocalStorage             | ⏳ Transitional |
| Persistence (Target) | **Dexie.js (IndexedDB)** | 🔜 Planned      |

### Migration Path

```
LocalStorage → Dexie.js (IndexedDB)
```

- Zustand will remain for UI state
- Dexie.js will handle all persistent data
- Full JSON export/import must be supported for data portability

---

## Core Architecture

### Separation of Concerns: Plan vs. Log

The app distinguishes between two fundamental concepts:

| Concept  | Purpose                                       | Mutability    |
| -------- | --------------------------------------------- | ------------- |
| **Plan** | Configuration/Template – defines _what_ to do | User-editable |
| **Log**  | Execution History – records _what was done_   | Append-only   |

A **Plan** is a blueprint that describes exercises, rep schemes, and progression rules. A **Log** captures the actual sets performed, timestamps, and outcomes. This separation allows:

- Reusing plans across training cycles
- Comparing planned vs. actual performance
- Modifying future plans without altering historical data

### No-Class Policy

> ⚠️ **All data models must be Plain Old JavaScript Objects (POJOs).**

**Why:** Classes break serialization in IndexedDB and complicate JSON export/import. Dexie.js stores raw objects; class instances lose their prototype chain on retrieval.

**Instead of:**

```typescript
// ❌ DO NOT USE
class Exercise {
  constructor(public name: string, public e1rm: number) {}
  calculateWeight(reps: number, rpe: number) { ... }
}
```

**Use:**

```typescript
// ✅ CORRECT APPROACH
interface Exercise {
  id: string;
  name: string;
  e1rm: number;
}

// Logic as pure function in src/lib
function calculateWeight(e1rm: number, reps: number, rpe: number): number { ... }
```

### Factory Functions

Use factory functions to create data objects with sensible defaults:

```typescript
// src/lib/factories/exercise.ts
function createExercise(overrides?: Partial<Exercise>): Exercise {
	return {
		id: generateId(),
		name: "",
		e1rm: 0,
		minWeightIncrement: 2.5,
		bodyweightPercentage: 0,
		...overrides,
	};
}
```

---

## Domain Model

### Hierarchy

```
Plan
 └── Routine[]
      └── ExerciseSlot[]
           └── SetScheme
           └── ProgressionConfig
```

### Plan

A training program spanning multiple weeks/cycles.

```typescript
interface Plan {
	id: string;
	name: string;
	routines: Routine[];
	createdAt: string;
}
```

### Routine

A single workout session template (e.g., "Push Day A").

```typescript
interface Routine {
	id: string;
	name: string;
	slots: ExerciseSlot[];
}
```

### ExerciseSlot

A placeholder within a routine, linking an exercise to its prescribed sets and progression rules.

```typescript
interface ExerciseSlot {
	id: string;
	exerciseId: string;
	setScheme: SetScheme;
	progression: ProgressionConfig;
}

interface SetScheme {
	sets: number;
	reps: number; // Target reps
	rpe: number; // Target RPE
	restSeconds: number;
}
```

---

## Progression Logic

Three progression types are supported, defined as a **Discriminated Union**:

```typescript
type ProgressionConfig = RpeAutoregConfig | LinkedBackoffConfig | DoubleProgressionConfig;
```

### 1. RPE_AUTOREG

Autoregulation based on Rate of Perceived Exertion. Weight is calculated from E1RM, target reps, and target RPE.

```typescript
interface RpeAutoregConfig {
	type: "RPE_AUTOREG";
	targetRpe: number; // e.g., 8
	e1rmAdjustment: "ALWAYS" | "ON_PR" | "MANUAL";
}
```

**Behavior:**

- Calculator outputs weight for given reps @ RPE
- After set completion, new E1RM is derived from actual performance
- E1RM update policy controlled by `e1rmAdjustment`

### 2. LINKED_BACKOFF

Top set followed by percentage-based backoff sets.

```typescript
interface LinkedBackoffConfig {
	type: "LINKED_BACKOFF";
	topSetRpe: number;
	backoffPercent: number; // e.g., 0.90 = 90% of top set weight
	backoffSets: number;
	backoffReps: number;
}
```

**Behavior:**

- First set is calculated as RPE autoreg (top set)
- Subsequent sets use `topSetWeight * backoffPercent`

### 3. DOUBLE_PROGRESSION

Linear progression within a rep range. Increase weight when top of range is achieved.

```typescript
interface DoubleProgressionConfig {
	type: "DOUBLE_PROGRESSION";
	repRange: { min: number; max: number };
	weightIncrement: number;
}
```

**Behavior:**

- Start at `repRange.min` with current weight
- When `repRange.max` is achieved for all sets, increase weight by `weightIncrement`
- Reset reps to `repRange.min`

---

## Coding Standards

### 1. Immutability

Never mutate state directly. Always return new objects.

```typescript
// ❌ WRONG
exercise.e1rm = newE1rm;

// ✅ CORRECT
const updated = { ...exercise, e1rm: newE1rm };
```

### 2. Pure Functions

All domain logic lives in `src/lib` as pure functions:

- No side effects
- Same inputs → same outputs
- Easily testable

```typescript
// src/lib/calculator/weight.ts
export function calculateWorkingWeight(e1rm: number, reps: number, rpe: number, formula: Formula = "brzycki"): number {
	// Pure calculation, no state access
}
```

### 3. Strictly Typed Interfaces

- Use `interface` for data shapes
- Use `type` for unions and computed types
- Discriminated unions for variant types (see ProgressionConfig)
- No `any` – use `unknown` and narrow with type guards

### 4. File Organization

```
src/
├── components/       # React components
├── lib/
│   ├── calculator/   # Weight/E1RM calculations
│   ├── factories/    # Object creation functions
│   ├── progression/  # Progression logic per type
│   └── utils/        # General utilities
├── pages/            # Route-level components
├── zustand/          # State stores (transitional)
└── types/            # Shared TypeScript interfaces
```

### 5. Naming Conventions

| Element      | Convention      | Example                  |
| ------------ | --------------- | ------------------------ |
| Interfaces   | PascalCase      | `ExerciseSlot`           |
| Type aliases | PascalCase      | `ProgressionConfig`      |
| Functions    | camelCase       | `calculateWorkingWeight` |
| Files        | kebab-case      | `weight-calculator.ts`   |
| Constants    | SCREAMING_SNAKE | `DEFAULT_RPE`            |

---

## Data Portability

The app must support full JSON export/import:

```typescript
interface ExportData {
	version: string;
	exportedAt: string;
	exercises: Exercise[];
	plans: Plan[];
	logs: WorkoutLog[];
	measurements: Measurement[];
}
```

- Export produces a single JSON file
- Import validates schema version and migrates if needed
- All data is POJO – no serialization issues

## Summary

| Principle            | Implementation                          |
| -------------------- | --------------------------------------- |
| Data-First           | POJOs only, no classes                  |
| Logic Separation     | Pure functions in `src/lib`             |
| Type Safety          | Discriminated unions, strict interfaces |
| Immutability         | Spread operators, no mutations          |
| Persistence-Agnostic | Dexie.js compatible, JSON portable      |

---

## Agent Operational Guidelines

- **Implementation Phase**: Agents should only begin implementation once the refinement phase is complete and the task requirements are fully transparent and unambiguous.
- **Clarification**: If any major components, requirements, or architectural details are missing or unclear, the agent must pause and ask for explicit clarification before proceeding.
- **Adherence**: Strictly follow the "No-Class" policy and other architectural constraints defined in this document.

---

## Design Guidelines

**Philosophy**: Minimalistic, inspired by **Scalable Capital**. Clean lines, high contrast, and data-centric.

### Color System

- **Modes**: Fully supported Dark & Light modes.
    - **Dark Mode**: Deep blacks/grays background, white text, `#1fc7b9` accent.
    - **Light Mode**: White/off-white background, black text, **Blue** accent.

### Typography

- **Fonts**: System sans-serif (Inter/SF Pro/Roboto) for clean readability.
- **Sizes**:
    - Headings: Bold, tight letter-spacing.
    - Body: Readable transparency (e.g., `text-gray-300` in dark mode).

### Components

- **Buttons**:
    - _Primary_: Solid `#1fc7b9` background with contrast text (black). Rounded corners (4-6px).
    - _Secondary_: Outline or Ghost style with accent text.
- **Form Fields**: Minimalist.
    - Default: Transparent/light background, subtle bottom border or full border.
    - Focus: Sharp accent color glow or border.
    - _Labels_: Small, uppercase, or floating labels.
- **Cards**:
    - Flat or very subtle elevation.
    - Dark Mode: Dark gray surface (`#1c1c1e`) against black background.
    - Light Mode: White surface with subtle stroke or shadow.
- **Dropdowns**: Minimalist lists. Hover states use distinct but subtle background changes.
- **Spacings**: Generous whitespace. 4-point grid (4, 8, 16, 24, 32px).
