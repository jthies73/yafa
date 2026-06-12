import { describe, it, expect } from "vitest";
import { DEFAULT_RPE_MATRIX } from "../../db/rpeMatrix";
import type { Set as LoggedSet } from "../../db/types";
import {
  applyMatrixUpdates,
  clampLookupReps,
  roundToLoadable,
  setMatrixCell,
  snapRpe,
} from "../matrix";

let setSeq = 0;
const makeSet = (
  actualReps: number,
  actualRpe: number | undefined,
  actualWeight: number,
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

describe("grid clamping", () => {
  it("snaps RPE to the 0.5 grid within 6..10", () => {
    expect(snapRpe(8.3)).toBe(8.5);
    expect(snapRpe(8.2)).toBe(8);
    expect(snapRpe(11)).toBe(10);
    expect(snapRpe(5)).toBe(6);
  });

  it("clamps lookup reps to the matrix rows", () => {
    expect(clampLookupReps(12)).toBe(10);
    expect(clampLookupReps(0)).toBe(1);
  });

  it("rounds weights to loadable increments", () => {
    expect(roundToLoadable(82.4)).toBe(82.5);
    expect(roundToLoadable(73.7)).toBe(72.5);
  });
});

describe("setMatrixCell (direct edit)", () => {
  it("writes the cell exactly and smooths ±1.0 RPE neighbors by the kernel", () => {
    // [5][9] = 0.82 → 0.85: delta +0.03; ±0.5 get +0.015, ±1.0 get +0.0075.
    const next = setMatrixCell(DEFAULT_RPE_MATRIX, 5, 9, 0.85);
    expect(next[5][9]).toBe(0.85);
    expect(next[5][8.5]).toBeCloseTo(0.81 + 0.015, 9);
    expect(next[5][9.5]).toBeCloseTo(0.84 + 0.015, 9);
    expect(next[5][8]).toBeCloseTo(0.79 + 0.0075, 9);
    expect(next[5][10]).toBeCloseTo(0.86 + 0.0075, 9);
    // Beyond the kernel and other rows: untouched. Input not mutated.
    expect(next[5][7.5]).toBe(DEFAULT_RPE_MATRIX[5][7.5]);
    expect(next[4][9]).toBe(DEFAULT_RPE_MATRIX[4][9]);
    expect(DEFAULT_RPE_MATRIX[5][9]).toBe(0.82);
  });
});

describe("matrix update + observed e1RM", () => {
  it("a first qualifying set fills the window but cannot nudge the matrix", () => {
    // With an empty window the observed e1RM IS the set's own implied e1RM,
    // so observed_pct equals the cell exactly — zero delta by construction.
    const { matrix, observedE1rms } = applyMatrixUpdates(
      DEFAULT_RPE_MATRIX,
      [],
      [makeSet(5, 9, 82)],
    );
    expect(observedE1rms).toHaveLength(1);
    expect(observedE1rms[0]).toBeCloseTo(100, 6); // 82 / 0.82
    expect(matrix[5][9]).toBeCloseTo(DEFAULT_RPE_MATRIX[5][9], 9);
  });

  it("EMA-nudges the touched cell and smooths ±1.0 RPE neighbors", () => {
    // History says e1RM ≈ 100; an 80kg 5×@9 set implies less (97.56), so the
    // cell and its neighbors must drift DOWN, with triangular falloff.
    const history = [100, 100];
    const { matrix, observedE1rms } = applyMatrixUpdates(
      DEFAULT_RPE_MATRIX,
      history,
      [makeSet(5, 9, 80)],
    );

    // implied = 80/0.82 = 97.5610; mean = 99.1870; pct = 80/99.1870 = 0.806557
    // delta = 0.1 × (0.806557 − 0.82) = −0.00134426
    expect(observedE1rms).toEqual([100, 100, expect.any(Number)]);
    expect(observedE1rms[2]).toBeCloseTo(97.560976, 5);
    expect(matrix[5][9]).toBeCloseTo(0.818656, 6);
    // ±0.5 neighbors receive half the delta.
    expect(matrix[5][8.5]).toBeCloseTo(0.81 - 0.000672, 5);
    expect(matrix[5][9.5]).toBeCloseTo(0.84 - 0.000672, 5);
    // ±1.0 neighbors receive a quarter.
    expect(matrix[5][8]).toBeCloseTo(0.79 - 0.000336, 5);
    expect(matrix[5][10]).toBeCloseTo(0.86 - 0.000336, 5);
    // Beyond the kernel and other rows: untouched.
    expect(matrix[5][7.5]).toBe(DEFAULT_RPE_MATRIX[5][7.5]);
    expect(matrix[4][9]).toBe(DEFAULT_RPE_MATRIX[4][9]);
  });

  it("smoothing at the RPE-10 edge never writes cells outside the grid", () => {
    const { matrix } = applyMatrixUpdates(
      DEFAULT_RPE_MATRIX,
      [100, 100],
      [makeSet(5, 10, 80)],
    );
    expect(Object.keys(matrix[5])).toEqual(Object.keys(DEFAULT_RPE_MATRIX[5]));
  });

  it("non-qualifying sets change nothing", () => {
    const sets = [
      makeSet(5, 7.5, 80), // RPE below 8
      makeSet(11, 9, 80), // reps above 10
      makeSet(5, undefined, 80), // no RPE logged
      makeSet(5, 9, 0), // no external load
    ];
    const { matrix, observedE1rms } = applyMatrixUpdates(
      DEFAULT_RPE_MATRIX,
      [100],
      sets,
    );
    expect(observedE1rms).toEqual([100]);
    expect(matrix).toEqual(DEFAULT_RPE_MATRIX);
  });

  it("keeps only the last 10 implied e1RMs and never mutates its inputs", () => {
    const history = Array.from({ length: 10 }, (_, i) => 90 + i); // 90..99
    const original = JSON.parse(JSON.stringify(DEFAULT_RPE_MATRIX));
    const { observedE1rms } = applyMatrixUpdates(DEFAULT_RPE_MATRIX, history, [
      makeSet(5, 9, 82),
    ]);
    expect(observedE1rms).toHaveLength(10);
    expect(observedE1rms[0]).toBe(91); // oldest (90) dropped
    expect(DEFAULT_RPE_MATRIX).toEqual(original);
    expect(history).toHaveLength(10);
  });
});
