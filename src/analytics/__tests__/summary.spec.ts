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

describe("adherence (effort-aware, pooled per set)", () => {
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

  // Scenario A — load miscalibration: reps short but the RPE cap was respected.
  it("excuses a rep shortfall when the RPE cap was met", () => {
    expect(
      score([makeSet({ targetReps: 8, actualReps: 6, actualRpe: 8 })], 1),
    ).toBe(100);
  });

  // Scenario B — ego lifting: reps hit, but RPE overshoots the cap.
  it("penalizes RPE overshoot (15 per point)", () => {
    expect(
      score([makeSet({ targetReps: 8, actualReps: 8, actualRpe: 10 })], 1),
    ).toBe(70);
  });

  // True failure: reps short AND RPE 10 — penalized on the RPE axis only.
  it("scores a true failure set on RPE alone, never double-hitting reps", () => {
    expect(
      score([makeSet({ targetReps: 8, actualReps: 5, actualRpe: 10 })], 1),
    ).toBe(70);
  });

  // Sandbag: reps short with effort left in reserve (under the cap).
  it("penalizes a rep shortfall when effort was left in reserve", () => {
    expect(
      score([makeSet({ targetReps: 8, actualReps: 3, actualRpe: 6 })], 1),
    ).toBe(75); // 100 − 5 reps × 5
  });

  // The lighter sets the engine prescribes after a failure land under the RPE
  // target by design — they must not be penalized for being easy.
  it("does not penalize a set that is easier than prescribed", () => {
    expect(
      score([makeSet({ targetReps: 8, actualReps: 8, actualRpe: 6 })], 1),
    ).toBe(100);
  });

  // Back-off / blank RPE: no RPE data → scored on reps only.
  it("scores a set without RPE on reps only", () => {
    expect(
      score(
        [
          makeSet({
            targetReps: 8,
            actualReps: 6,
            targetRpe: undefined,
            actualRpe: undefined,
          }),
        ],
        1,
      ),
    ).toBe(90); // 100 − 2 reps × 5
  });

  // Scenario C — a skipped set scores 0 against the prescribed denominator.
  it("counts a skipped set as 0 over the prescribed denominator", () => {
    expect(score([makeSet(), makeSet()], 3)).toBeCloseTo(200 / 3);
  });

  // Scenario D — extra sets dock the pooled score by 10 each (junk volume).
  it("docks 10 points per extra set beyond the prescription", () => {
    const sets = [
      makeSet({ timestamp: T0 + 1 }),
      makeSet({ timestamp: T0 + 2 }),
      makeSet({ timestamp: T0 + 3 }),
      makeSet({ timestamp: T0 + 4 }),
    ];
    expect(score(sets, 3)).toBe(90);
  });

  it("scores 100 when nothing was prescribed (freeform session)", () => {
    expect(score([makeSet(), makeSet()], 0)).toBe(100);
  });

  it("pools per-set scores across exercises against total prescribed", () => {
    const a = makeExercise({ name: "A" });
    const b = makeExercise({ name: "B" });
    const summary = computeWorkoutSummary(
      baseInput({
        workout: makeWorkout(T0, [
          { exerciseId: a.id, sets: [makeSet(), makeSet()] }, // 2/2 perfect
          { exerciseId: b.id, sets: [makeSet()] }, // 1/2 — second skipped → 0
        ]),
        exercisesById: new Map([
          [a.id, a],
          [b.id, b],
        ]),
        plannedCounts: { [a.id]: 2, [b.id]: 2 },
      }),
    );
    // (100 + 100 + 100 + 0) / 4 = 75
    expect(summary.adherence.score).toBe(75);
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
      {
        exerciseId: ex.id,
        sets: [makeSet({ actualWeight: 100, actualReps: 8 })],
      },
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
          makeSet({
            actualReps: 5,
            actualWeight: 100,
            timestamp: T0 - DAY + 1,
          }),
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
