import { describe, it, expect } from "vitest";
import type {
  ProgressionState,
  RoutineExerciseConfig,
  Set as LoggedSet,
} from "../../db/types";
import { advanceProgression, evaluateLinear } from "../progression";

let setSeq = 0;
const makeSet = (
  actualReps: number,
  targetReps: number,
  actualRpe?: number,
  targetRpe?: number,
  actualWeight = 100,
  targetWeight = 100,
): LoggedSet => ({
  id: `set-${++setSeq}`,
  timestamp: setSeq,
  targetReps,
  actualReps,
  targetWeight,
  actualWeight,
  targetRpe,
  actualRpe,
  failure: false,
});

// Shorthand: set where actual === target (clean hit)
const hitSet = (reps: number, rpe?: number, weight = 100) =>
  makeSet(reps, reps, rpe, rpe, weight, weight);

// Shorthand: set where reps and RPE are both off at the prescribed weight
const failSet = (
  actualReps: number,
  targetReps: number,
  actualRpe: number,
  targetRpe: number,
  weight = 100,
) => makeSet(actualReps, targetReps, actualRpe, targetRpe, weight, weight);

const makeState = (
  overrides: Partial<ProgressionState> = {},
): ProgressionState => ({
  exerciseId: "ex",
  workingE1rm: 100,
  observedE1rms: [],
  failureStreak: 0,
  resetModifiers: [],
  updated_at: 0,
  ...overrides,
});

const LP_CONFIG: RoutineExerciseConfig = {
  progressionModel: "linear",
  progressionParams: {
    targetSets: 3,
    targetReps: 5,
    targetRpe: 8,
    weightIncrement: 2.5,
  },
};

describe("set failure condition", () => {
  it("fails only when reps short AND RPE over AND weight matches", () => {
    // All three conditions met → failure
    expect(evaluateLinear([failSet(4, 5, 9, 8)])).toBe("failure");
  });

  it("success when reps short but RPE on target", () => {
    expect(evaluateLinear([makeSet(4, 5, 8, 8)])).toBe("success");
  });

  it("success when reps short but RPE not supplied", () => {
    expect(evaluateLinear([makeSet(4, 5)])).toBe("success");
  });

  it("success when reps short and RPE over but weight was changed", () => {
    // Actual weight differs from target → set is ignored
    expect(evaluateLinear([makeSet(4, 5, 9, 8, 97.5, 100)])).toBe("success");
  });

  it("success when reps met even if RPE is high", () => {
    expect(evaluateLinear([hitSet(5, 9.5)])).toBe("success");
  });

  it("success on empty set list", () => {
    expect(evaluateLinear([])).toBe("success");
  });
});

describe("linear progression state transitions", () => {
  const successSets = () => [hitSet(5, 8), hitSet(5, 8), hitSet(5, 8)];
  const failSets = () => [failSet(4, 5, 9, 8), failSet(4, 5, 9, 8), failSet(4, 5, 9, 8)];

  it("success adds the weight increment and clears the streak", () => {
    const state = advanceProgression(
      LP_CONFIG,
      makeState({ failureStreak: 2 }),
      successSets(),
    );
    expect(state.workingE1rm).toBeCloseTo(102.5);
    expect(state.failureStreak).toBe(0);
    expect(state.resetModifiers).toHaveLength(0);
  });

  it("failure increments the streak but does not fire reset below trigger", () => {
    const state = advanceProgression(LP_CONFIG, makeState(), failSets());
    expect(state.failureStreak).toBe(1);
    expect(state.workingE1rm).toBeCloseTo(100);
    expect(state.resetModifiers).toHaveLength(0);
  });

  it("fires the intensity reset on exactly the third consecutive failure", () => {
    let state = makeState();
    state = advanceProgression(LP_CONFIG, state, failSets());
    state = advanceProgression(LP_CONFIG, state, failSets());
    expect(state.failureStreak).toBe(2);
    expect(state.resetModifiers).toHaveLength(0);

    state = advanceProgression(LP_CONFIG, state, failSets());
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("intensity");
    expect(state.workingE1rm).toBeCloseTo(90);
    expect(state.failureStreak).toBe(0);
  });

  it("intensity reset snaps to the observed e1RM when it is below the flat cut", () => {
    let state = makeState({ failureStreak: 2, observedE1rms: [85, 85] });
    state = advanceProgression(LP_CONFIG, state, failSets());
    expect(state.workingE1rm).toBeCloseTo(85);
  });

  it("a set with changed weight is not a failure — streak does not accumulate", () => {
    // Reps short and RPE over, but user loaded 97.5 instead of 100
    const adjustedSets = () => [makeSet(4, 5, 9, 8, 97.5, 100)];
    let state = makeState();
    state = advanceProgression(LP_CONFIG, state, adjustedSets());
    state = advanceProgression(LP_CONFIG, state, adjustedSets());
    state = advanceProgression(LP_CONFIG, state, adjustedSets());
    expect(state.resetModifiers).toHaveLength(0);
  });
});

describe("top set + back-off", () => {
  const TS_CONFIG: RoutineExerciseConfig = {
    progressionModel: "topset_backoff",
    progressionParams: {
      topSetTargetReps: 5,
      topSetTargetRpe: 8,
      backOffSets: 2,
      percentageDrop: 10,
      weightIncrement: 2.5,
    },
  };

  it("only the top set drives evaluation — back-off failures are ignored", () => {
    // Top set clean, back-offs both failed: still success
    const sets = [hitSet(5, 8), failSet(2, 5, 10, 8), failSet(1, 5, 10, 8)];
    const state = advanceProgression(TS_CONFIG, makeState(), sets);
    expect(state.workingE1rm).toBeCloseTo(102.5);
    expect(state.failureStreak).toBe(0);
  });

  it("top set failure increments the streak", () => {
    // Top set: reps short AND RPE over → failure
    const sets = [failSet(4, 5, 9, 8), hitSet(5, 8), hitSet(5, 8)];
    const state = advanceProgression(TS_CONFIG, makeState(), sets);
    expect(state.failureStreak).toBe(1);
    expect(state.workingE1rm).toBeCloseTo(100);
  });

  it("fires the intensity reset on exactly the third consecutive top-set failure", () => {
    const failedTopSet = () => [failSet(4, 5, 9, 8), hitSet(5, 8), hitSet(5, 8)];
    let state = makeState();
    state = advanceProgression(TS_CONFIG, state, failedTopSet());
    state = advanceProgression(TS_CONFIG, state, failedTopSet());
    expect(state.failureStreak).toBe(2);

    state = advanceProgression(TS_CONFIG, state, failedTopSet());
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("intensity");
    expect(state.workingE1rm).toBeCloseTo(90);
    expect(state.failureStreak).toBe(0);
  });

  it("top set with changed weight is not a failure", () => {
    const sets = [makeSet(4, 5, 9, 8, 97.5, 100), hitSet(5, 8)];
    const state = advanceProgression(TS_CONFIG, makeState(), sets);
    expect(state.failureStreak).toBe(0);
    expect(state.workingE1rm).toBeCloseTo(102.5);
  });
});

describe("double progression", () => {
  const DP_CONFIG: RoutineExerciseConfig = {
    progressionModel: "double",
    progressionParams: {
      targetSets: 3,
      minReps: 8,
      maxReps: 12,
      weightIncrement: 2.5,
    },
  };

  it("hitting maxReps everywhere adds the increment and restarts at minReps", () => {
    const sets = [hitSet(12, 9, 50), hitSet(12, 9, 50), hitSet(13, 9.5, 50)];
    const state = advanceProgression(
      DP_CONFIG,
      makeState({ currentTargetReps: 12 }),
      sets,
    );
    expect(state.workingE1rm).toBeCloseTo(102.5);
    expect(state.currentTargetReps).toBe(8);
    expect(state.failureStreak).toBe(0);
  });

  it("advances the rep target from the worst set, never backwards", () => {
    const sets = [
      makeSet(10, 10, undefined, undefined, 50),
      makeSet(9, 9, undefined, undefined, 50),
    ];
    const advanced = advanceProgression(
      DP_CONFIG,
      makeState({ currentTargetReps: 9 }),
      sets,
    );
    expect(advanced.currentTargetReps).toBe(10);

    const badDay = advanceProgression(
      DP_CONFIG,
      makeState({ currentTargetReps: 11 }),
      [makeSet(7, 7, undefined, undefined, 50)],
    );
    expect(badDay.currentTargetReps).toBe(11);
  });

  it("fires the intensity reset on exactly the third consecutive failure", () => {
    // Reps short AND RPE over at same weight → failure each session
    const failSets3 = () => [
      failSet(7, 8, 9, 8, 50),
      failSet(7, 8, 9, 8, 50),
      failSet(7, 8, 9, 8, 50),
    ];
    let state = makeState();
    state = advanceProgression(DP_CONFIG, state, failSets3());
    state = advanceProgression(DP_CONFIG, state, failSets3());
    expect(state.failureStreak).toBe(2);
    expect(state.resetModifiers).toHaveLength(0);

    state = advanceProgression(DP_CONFIG, state, failSets3());
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("intensity");
    expect(state.workingE1rm).toBeCloseTo(90);
    expect(state.failureStreak).toBe(0);
  });

  it("neutral session (no failure, no maxReps) clears the failure streak", () => {
    const neutralSets = () => [
      makeSet(10, 10, 8, 8, 50),
      makeSet(10, 10, 8, 8, 50),
    ];
    const state = advanceProgression(
      DP_CONFIG,
      makeState({ failureStreak: 2 }),
      neutralSets(),
    );
    expect(state.failureStreak).toBe(0);
    expect(state.resetModifiers).toHaveLength(0);
  });
});
