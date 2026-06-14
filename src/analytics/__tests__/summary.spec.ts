import { describe, it, expect } from "vitest";
import type { Exercise, Set as LoggedSet, Workout } from "../../db/types";
import { DEFAULT_RPE_MATRIX } from "../../db/rpeMatrix";
import { impliedE1rm } from "../../engine/matrix";
import { computeWorkoutSummary, type SummaryInput } from "../summary";

let nextId = 0;
const uid = (prefix: string) => `${prefix}-${++nextId}`;

const T0 = new Date(2026, 0, 6, 10).getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: uid("ex"),
  name: "Exercise",
  primaryMuscleGroups: ["Chest"],
  created_at: 0,
  ...overrides,
});

const makeSet = (overrides: Partial<LoggedSet> = {}): LoggedSet => ({
  id: uid("set"),
  timestamp: T0,
  targetReps: 5,
  actualReps: 5,
  targetWeight: 100,
  actualWeight: 100,
  targetRpe: 8,
  actualRpe: 8,
  failure: false,
  ...overrides,
});

const makeWorkout = (
  startTime: number,
  exercises: { exerciseId: string; sets: LoggedSet[] }[],
  overrides: Partial<Workout> = {},
): Workout => ({
  id: uid("w"),
  routineId: "r1",
  startTime,
  endTime: startTime + HOUR,
  exercises,
  ...overrides,
});

const baseInput = (over: Partial<SummaryInput>): SummaryInput => ({
  workout: makeWorkout(T0, []),
  history: [],
  exercisesById: new Map(),
  plannedCounts: {},
  ...over,
});

describe("session metrics", () => {
  it("reports duration and Σ(reps × weight) volume load", () => {
    const ex = makeExercise();
    const workout = makeWorkout(
      T0,
      [
        {
          exerciseId: ex.id,
          sets: [
            makeSet({ actualReps: 5, actualWeight: 100 }),
            makeSet({ actualReps: 8, actualWeight: 60 }),
          ],
        },
      ],
      { endTime: T0 + 75 * 60 * 1000 },
    );
    const summary = computeWorkoutSummary(
      baseInput({ workout, exercisesById: new Map([[ex.id, ex]]) }),
    );
    expect(summary.durationMs).toBe(75 * 60 * 1000);
    expect(summary.volumeLoad).toBe(5 * 100 + 8 * 60);
  });

  it("counts completed vs planned sets and flags overshoot", () => {
    const ex = makeExercise();
    const workout = makeWorkout(T0, [
      { exerciseId: ex.id, sets: [makeSet(), makeSet(), makeSet(), makeSet()] },
    ]);
    const summary = computeWorkoutSummary(
      baseInput({
        workout,
        exercisesById: new Map([[ex.id, ex]]),
        plannedCounts: { [ex.id]: 3 },
      }),
    );
    expect(summary.sets).toEqual({ completed: 4, planned: 3, overshoot: true });
  });
});

describe("adherence", () => {
  const ex = makeExercise();
  const score = (sets: LoggedSet[], planned: number) =>
    computeWorkoutSummary(
      baseInput({
        workout: makeWorkout(T0, [{ exerciseId: ex.id, sets }]),
        exercisesById: new Map([[ex.id, ex]]),
        plannedCounts: { [ex.id]: planned },
      }),
    ).adherence.score;

  it("is 100% when every planned set hits its target", () => {
    expect(score([makeSet(), makeSet(), makeSet()], 3)).toBe(100);
  });

  it("penalizes undershot reps", () => {
    expect(score([makeSet(), makeSet(), makeSet({ actualReps: 3 })], 3)).toBeCloseTo(
      (2 / 3) * 100,
    );
  });

  it("penalizes RPE overshoot beyond +0.5, tolerates exactly +0.5", () => {
    expect(score([makeSet({ targetRpe: 8, actualRpe: 8.5 })], 1)).toBe(100);
    expect(score([makeSet({ targetRpe: 8, actualRpe: 9 })], 1)).toBe(0);
  });

  it("penalizes extra sets with completed as the denominator (overshoot)", () => {
    const sets = [
      makeSet({ timestamp: T0 + 1 }),
      makeSet({ timestamp: T0 + 2 }),
      makeSet({ timestamp: T0 + 3 }),
      makeSet({ timestamp: T0 + 4 }),
    ];
    expect(score(sets, 3)).toBe(75);
  });

  it("penalizes missed sets with planned as the denominator (undershoot)", () => {
    expect(score([makeSet(), makeSet()], 3)).toBeCloseTo((2 / 3) * 100);
  });
});

describe("PR detection", () => {
  it("flags an e1RM PR when the peak beats every prior session", () => {
    const ex = makeExercise({ name: "Squat" });
    const prior = makeWorkout(T0 - 10 * DAY, [
      {
        exerciseId: ex.id,
        sets: [makeSet({ actualWeight: 100, timestamp: T0 - 10 * DAY })],
      },
    ]);
    const workout = makeWorkout(T0, [
      { exerciseId: ex.id, sets: [makeSet({ actualWeight: 110 })] },
    ]);
    const summary = computeWorkoutSummary(
      baseInput({
        workout,
        history: [prior],
        exercisesById: new Map([[ex.id, ex]]),
      }),
    );
    const pr = summary.prs.find((p) => p.type === "e1rm");
    expect(pr).toBeDefined();
    expect(pr!.e1rm).toBeCloseTo(impliedE1rm(DEFAULT_RPE_MATRIX, 110, 5, 8));
  });

  it("does not flag an e1RM PR on the very first session (no prior data)", () => {
    const ex = makeExercise();
    const workout = makeWorkout(T0, [
      { exerciseId: ex.id, sets: [makeSet({ actualWeight: 110 })] },
    ]);
    const summary = computeWorkoutSummary(
      baseInput({ workout, exercisesById: new Map([[ex.id, ex]]) }),
    );
    expect(summary.prs.some((p) => p.type === "e1rm")).toBe(false);
  });

  it("flags a rep PR at an exact load with prior history", () => {
    const ex = makeExercise();
    const prior = makeWorkout(T0 - DAY, [
      {
        exerciseId: ex.id,
        sets: [
          makeSet({
            actualWeight: 100,
            actualReps: 6,
            timestamp: T0 - DAY,
          }),
        ],
      },
    ]);
    const workout = makeWorkout(T0, [
      { exerciseId: ex.id, sets: [makeSet({ actualWeight: 100, actualReps: 8 })] },
    ]);
    const summary = computeWorkoutSummary(
      baseInput({
        workout,
        history: [prior],
        exercisesById: new Map([[ex.id, ex]]),
      }),
    );
    const pr = summary.prs.find((p) => p.type === "rep");
    expect(pr).toMatchObject({ weight: 100, reps: 8 });
  });

  it("flags a secondary exercise volume PR vs best prior single session", () => {
    const ex = makeExercise();
    const prior = makeWorkout(T0 - DAY, [
      {
        exerciseId: ex.id,
        sets: [
          makeSet({ actualReps: 5, actualWeight: 100, timestamp: T0 - DAY }),
          makeSet({ actualReps: 5, actualWeight: 100, timestamp: T0 - DAY + 1 }),
        ],
      },
    ]);
    const workout = makeWorkout(T0, [
      {
        exerciseId: ex.id,
        sets: [
          makeSet({ actualReps: 5, actualWeight: 100 }),
          makeSet({ actualReps: 5, actualWeight: 100 }),
          makeSet({ actualReps: 5, actualWeight: 100 }),
        ],
      },
    ]);
    const summary = computeWorkoutSummary(
      baseInput({
        workout,
        history: [prior],
        exercisesById: new Map([[ex.id, ex]]),
      }),
    );
    const pr = summary.prs.find((p) => p.type === "volume");
    expect(pr).toMatchObject({ volume: 1500 });
  });
});
