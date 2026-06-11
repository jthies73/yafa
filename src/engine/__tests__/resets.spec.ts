import { describe, it, expect } from "vitest";
import type { ResetModifier } from "../../db/types";
import {
  INTENSITY_RESET_DECAY_SESSIONS,
  VOLUME_RESET_DECAY_SESSIONS,
} from "../config";
import {
  createIntensityResetModifier,
  createVolumeResetModifier,
  effectiveMagnitude,
  intensityResetE1rm,
  resetMultiplier,
  tickModifiers,
} from "../resets";

describe("decaying reset modifiers", () => {
  it("tapers linearly from full magnitude to zero", () => {
    const volume = createVolumeResetModifier(); // 0.3 over 3 sessions
    expect(effectiveMagnitude(volume)).toBeCloseTo(0.3);
    expect(effectiveMagnitude({ ...volume, sessionsElapsed: 1 })).toBeCloseTo(
      0.2,
    );
    expect(effectiveMagnitude({ ...volume, sessionsElapsed: 2 })).toBeCloseTo(
      0.1,
    );
    expect(effectiveMagnitude({ ...volume, sessionsElapsed: 3 })).toBe(0);

    const intensity = createIntensityResetModifier(); // 0.1 over 5 sessions
    expect(effectiveMagnitude(intensity)).toBeCloseTo(0.1);
    expect(
      effectiveMagnitude({ ...intensity, sessionsElapsed: 2 }),
    ).toBeCloseTo(0.06);
    expect(effectiveMagnitude({ ...intensity, sessionsElapsed: 5 })).toBe(0);
  });

  it("volume reset shapes exactly its decay window's sessions, then expires", () => {
    let modifiers: ResetModifier[] = [createVolumeResetModifier()];
    const multipliers: number[] = [];
    while (modifiers.length) {
      multipliers.push(resetMultiplier(modifiers, "volume"));
      modifiers = tickModifiers(modifiers);
    }
    expect(multipliers).toHaveLength(VOLUME_RESET_DECAY_SESSIONS);
    expect(multipliers[0]).toBeCloseTo(0.7);
    expect(multipliers[1]).toBeCloseTo(0.8);
    expect(multipliers[2]).toBeCloseTo(0.9);
  });

  it("intensity reset decays over its longer window", () => {
    let modifiers: ResetModifier[] = [createIntensityResetModifier()];
    const multipliers: number[] = [];
    while (modifiers.length) {
      multipliers.push(resetMultiplier(modifiers, "intensity"));
      modifiers = tickModifiers(modifiers);
    }
    expect(multipliers).toHaveLength(INTENSITY_RESET_DECAY_SESSIONS);
    expect(multipliers[0]).toBeCloseTo(0.9);
    expect(multipliers[4]).toBeCloseTo(0.98);
    expect(INTENSITY_RESET_DECAY_SESSIONS).toBeGreaterThan(
      VOLUME_RESET_DECAY_SESSIONS,
    );
  });

  it("only affects targets of its own kind and stacks multiplicatively", () => {
    const modifiers = [
      createVolumeResetModifier(),
      createVolumeResetModifier(),
    ];
    expect(resetMultiplier(modifiers, "volume")).toBeCloseTo(0.49);
    expect(resetMultiplier(modifiers, "intensity")).toBe(1);
  });

  it("intensity reset re-baselines the working e1RM downward only", () => {
    // No observed data: flat -10% cut.
    expect(intensityResetE1rm(100, null)).toBeCloseTo(90);
    // Observed below the cut: snap to demonstrated capacity.
    expect(intensityResetE1rm(100, 85)).toBeCloseTo(85);
    // Observed above the cut (or above working): never reduces the cut.
    expect(intensityResetE1rm(100, 95)).toBeCloseTo(90);
    expect(intensityResetE1rm(100, 120)).toBeCloseTo(90);
  });
});
