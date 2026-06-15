import { describe, it, expect } from "vitest";
import type { ResetModifier } from "../../db/types";
import { INTENSITY_RESET_DECAY_SESSIONS } from "../config";
import {
  createIntensityResetModifier,
  effectiveMagnitude,
  intensityResetE1rm,
  resetMultiplier,
  tickModifiers,
} from "../resets";

describe("decaying reset modifiers", () => {
  it("tapers linearly from full magnitude to zero", () => {
    const intensity = createIntensityResetModifier(); // 0.1 over 5 sessions
    expect(effectiveMagnitude(intensity)).toBeCloseTo(0.1);
    expect(
      effectiveMagnitude({ ...intensity, sessionsElapsed: 2 }),
    ).toBeCloseTo(0.06);
    expect(effectiveMagnitude({ ...intensity, sessionsElapsed: 5 })).toBe(0);
  });

  it("intensity reset decays over its full window then expires", () => {
    let modifiers: ResetModifier[] = [createIntensityResetModifier()];
    const multipliers: number[] = [];
    while (modifiers.length) {
      multipliers.push(resetMultiplier(modifiers, "intensity"));
      modifiers = tickModifiers(modifiers);
    }
    expect(multipliers).toHaveLength(INTENSITY_RESET_DECAY_SESSIONS);
    expect(multipliers[0]).toBeCloseTo(0.9);
    expect(multipliers[4]).toBeCloseTo(0.98);
  });

  it("stacks multiplicatively and only affects intensity targets", () => {
    const modifiers = [
      createIntensityResetModifier(),
      createIntensityResetModifier(),
    ];
    // 0.9 × 0.9 = 0.81
    expect(resetMultiplier(modifiers, "intensity")).toBeCloseTo(0.81);
    expect(resetMultiplier(modifiers, "volume")).toBe(1);
  });

  it("intensity reset applies a flat downward cut to the working e1RM", () => {
    expect(intensityResetE1rm(100)).toBeCloseTo(90);
    expect(intensityResetE1rm(200)).toBeCloseTo(180);
  });
});
