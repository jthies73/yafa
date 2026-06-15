import { describe, it, expect } from "vitest";
import { DEFAULT_RPE_MATRIX } from "../../db/rpeMatrix";
import { proposeSetAdjustment } from "../adjustment";

const M = DEFAULT_RPE_MATRIX;

// The previous set's implied e1RM is the anchor. Choosing prev (weight, reps,
// rpe) at the SAME reps/rpe as the target makes the proposed weight resolve to
// the prev weight (the percentages cancel), so the direction is exact and
// independent of the matrix's specific values.
describe("proposeSetAdjustment", () => {
  it("raises the load when the previous set demonstrated more capacity", () => {
    const p = proposeSetAdjustment(
      M,
      { weight: 110, reps: 5, rpe: 8 },
      { reps: 5, rpe: 8, weight: 100 },
    );
    expect(p).not.toBeNull();
    expect(p!.weight).toBe(110); // loadable, > the 100 target
    expect(p!.reps).toBe(5); // pairs exactly with 110 @ RPE 8
    expect(p!.rpe).toBe(8);
  });

  it("lowers the load when the previous set demonstrated less capacity", () => {
    const p = proposeSetAdjustment(
      M,
      { weight: 90, reps: 5, rpe: 8 },
      { reps: 5, rpe: 8, weight: 100 },
    );
    expect(p).not.toBeNull();
    expect(p!.weight).toBe(90);
    expect(p!.reps).toBe(5);
  });

  it("returns null when the outcome reproduces the current target", () => {
    const p = proposeSetAdjustment(
      M,
      { weight: 100, reps: 5, rpe: 8 },
      { reps: 5, rpe: 8, weight: 100 },
    );
    expect(p).toBeNull();
  });

  it("re-loads a back-off target (rpe null) without touching reps or RPE", () => {
    const p = proposeSetAdjustment(
      M,
      { weight: 100, reps: 5, rpe: 8 },
      { reps: 6, rpe: null, weight: 50 },
    );
    expect(p).not.toBeNull();
    expect(p!.reps).toBe(6); // unchanged
    expect(p!.rpe).toBeNull(); // no RPE invented
    expect(p!.weight).toBeGreaterThan(50); // re-loaded from the demonstrated e1RM
  });
});
