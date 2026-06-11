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
  actualRpe?: number,
  actualWeight = 100,
): LoggedSet => ({
  id: `set-${++setSeq}`,
  timestamp: setSeq,
  targetReps: actualReps,
  actualReps,
  targetWeight: actualWeight,
  actualWeight,
  targetRpe: actualRpe,
  actualRpe,
  failure: false,
});

const makeState = (
  overrides: Partial<ProgressionState> = {},
): ProgressionState => ({
  exerciseId: "ex",
  workingE1rm: 100,
  observedE1rms: [],
  failureStreak: 0,
  regressionStreak: 0,
  plateauStreak: 0,
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

const LP_PARAMS = LP_CONFIG.progressionParams as never;

describe("linear progression three-way outcome", () => {
  it("progresses when all sets hit reps at or below target RPE", () => {
    const sets = [makeSet(5, 8), makeSet(5, 7.5), makeSet(6, 8)];
    expect(evaluateLinear(LP_PARAMS, sets)).toBe("progress");
  });

  it("holds in the grey zone: reps met, RPE within one point over target", () => {
    expect(evaluateLinear(LP_PARAMS, [makeSet(5, 8.5)])).toBe("hold");
    // Exactly one point over is still hold — failure needs MORE than +1.
    expect(evaluateLinear(LP_PARAMS, [makeSet(5, 9)])).toBe("hold");
  });

  it("fails when RPE exceeds target by more than one point", () => {
    expect(evaluateLinear(LP_PARAMS, [makeSet(5, 9.5)])).toBe("failure");
  });

  it("fails when any set misses the rep target", () => {
    const sets = [makeSet(5, 8), makeSet(4, 8), makeSet(5, 8)];
    expect(evaluateLinear(LP_PARAMS, sets)).toBe("failure");
  });

  it("ignores missing RPEs, judging on reps alone", () => {
    expect(evaluateLinear(LP_PARAMS, [makeSet(5), makeSet(5)])).toBe(
      "progress",
    );
  });
});

describe("linear progression state transitions", () => {
  const progressSession = () => [makeSet(5, 8), makeSet(5, 8), makeSet(5, 8)];
  const failSession = () => [makeSet(4, 9), makeSet(4, 9), makeSet(4, 9)];
  const holdSession = () => [makeSet(5, 9), makeSet(5, 8.5), makeSet(5, 8)];

  it("progress adds the weight increment and clears the streak", () => {
    const state = advanceProgression(
      LP_CONFIG,
      makeState({ failureStreak: 2 }),
      progressSession(),
    );
    expect(state.workingE1rm).toBeCloseTo(102.5);
    expect(state.failureStreak).toBe(0);
    expect(state.resetModifiers).toHaveLength(0);
  });

  it("fires the intensity reset on exactly the third consecutive failure", () => {
    let state = makeState();
    state = advanceProgression(LP_CONFIG, state, failSession());
    state = advanceProgression(LP_CONFIG, state, failSession());
    // Two failures: streak grows, no reset, e1RM untouched.
    expect(state.failureStreak).toBe(2);
    expect(state.resetModifiers).toHaveLength(0);
    expect(state.workingE1rm).toBeCloseTo(100);

    state = advanceProgression(LP_CONFIG, state, failSession());
    // Third failure: lasting -10% cut, decaying modifier queued, streak zeroed.
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("intensity");
    expect(state.workingE1rm).toBeCloseTo(90);
    expect(state.failureStreak).toBe(0);
  });

  it("holds neither clear nor advance the failure streak", () => {
    let state = makeState();
    state = advanceProgression(LP_CONFIG, state, failSession());
    state = advanceProgression(LP_CONFIG, state, failSession());
    state = advanceProgression(LP_CONFIG, state, holdSession());
    expect(state.failureStreak).toBe(2);
    expect(state.resetModifiers).toHaveLength(0);

    state = advanceProgression(LP_CONFIG, state, failSession());
    expect(state.resetModifiers).toHaveLength(1);
  });

  it("intensity reset snaps to the observed e1RM when it is below the flat cut", () => {
    let state = makeState({ failureStreak: 2, observedE1rms: [85, 85] });
    state = advanceProgression(LP_CONFIG, state, failSession());
    expect(state.workingE1rm).toBeCloseTo(85);
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

  it("only the top set drives progression — back-off sets are ignored", () => {
    // Top set clean, back-offs ground to dust: still a progression.
    const sets = [makeSet(5, 8), makeSet(2, 10), makeSet(1, 10)];
    const state = advanceProgression(TS_CONFIG, makeState(), sets);
    expect(state.workingE1rm).toBeCloseTo(102.5);
    expect(state.failureStreak).toBe(0);
  });

  it("fires the intensity reset on exactly the third flagged session", () => {
    // Reps met but RPE ran more than 1 over target: systemic-cost flag.
    const flaggedSession = () => [
      makeSet(5, 9.5),
      makeSet(5, 8),
      makeSet(5, 8),
    ];
    let state = makeState();
    state = advanceProgression(TS_CONFIG, state, flaggedSession());
    state = advanceProgression(TS_CONFIG, state, flaggedSession());
    expect(state.failureStreak).toBe(2);
    expect(state.resetModifiers).toHaveLength(0);

    state = advanceProgression(TS_CONFIG, state, flaggedSession());
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("intensity");
    expect(state.workingE1rm).toBeCloseTo(90);
    expect(state.failureStreak).toBe(0);
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
    const sets = [makeSet(12, 9, 50), makeSet(12, 9, 50), makeSet(13, 9.5, 50)];
    const state = advanceProgression(
      DP_CONFIG,
      makeState({ currentTargetReps: 12 }),
      sets,
    );
    expect(state.workingE1rm).toBeCloseTo(102.5);
    expect(state.currentTargetReps).toBe(8);
  });

  it("advances the rep target from the worst set, never backwards", () => {
    const sets = [makeSet(10, undefined, 50), makeSet(9, undefined, 50)];
    const advanced = advanceProgression(
      DP_CONFIG,
      makeState({ currentTargetReps: 9 }),
      sets,
    );
    expect(advanced.currentTargetReps).toBe(10);

    const badDay = advanceProgression(
      DP_CONFIG,
      makeState({ currentTargetReps: 11 }),
      [makeSet(7, undefined, 50)],
    );
    expect(badDay.currentTargetReps).toBe(11);
  });

  it("fires the volume reset on exactly the second consecutive regression", () => {
    const session = (reps: number) => [
      makeSet(reps, undefined, 50),
      makeSet(reps, undefined, 50),
      makeSet(reps, undefined, 50),
    ];
    let state = makeState({ lastSessionReps: 30, lastSessionWeight: 50 });
    state = advanceProgression(DP_CONFIG, state, session(9)); // 27 < 30
    expect(state.regressionStreak).toBe(1);
    expect(state.resetModifiers).toHaveLength(0);

    state = advanceProgression(DP_CONFIG, state, session(8)); // 24 < 27
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("volume");
    expect(state.regressionStreak).toBe(0);
    // Volume reset never touches the working e1RM.
    expect(state.workingE1rm).toBeCloseTo(100);
  });

  it("fires the volume reset on the fourth consecutive plateau, not the third", () => {
    const session = () => [
      makeSet(9, undefined, 50),
      makeSet(9, undefined, 50),
      makeSet(9, undefined, 50),
    ];
    let state = makeState({ lastSessionReps: 27, lastSessionWeight: 50 });
    for (let i = 1; i <= 3; i++) {
      state = advanceProgression(DP_CONFIG, state, session());
      expect(state.plateauStreak).toBe(i);
      expect(state.resetModifiers).toHaveLength(0);
    }
    state = advanceProgression(DP_CONFIG, state, session());
    expect(state.resetModifiers).toHaveLength(1);
    expect(state.resetModifiers[0].kind).toBe("volume");
    expect(state.plateauStreak).toBe(0);
  });

  it("a weight change resets the comparison baseline", () => {
    let state = makeState({
      lastSessionReps: 30,
      lastSessionWeight: 50,
      regressionStreak: 1,
    });
    state = advanceProgression(DP_CONFIG, state, [makeSet(8, undefined, 52.5)]);
    expect(state.regressionStreak).toBe(0);
    expect(state.lastSessionWeight).toBe(52.5);
  });
});
