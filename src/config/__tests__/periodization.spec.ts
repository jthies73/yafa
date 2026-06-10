import { describe, it, expect } from "vitest";
import { FOCUS_META, FOCUS_ORDER, MESOCYCLE_PRESETS } from "../periodization";
import type { PeriodizationFocus } from "../../db/types";

const FOCUSES = Object.keys(FOCUS_META) as PeriodizationFocus[];

describe("periodization focus config", () => {
  it("FOCUS_ORDER lists every focus exactly once", () => {
    expect([...FOCUS_ORDER].sort()).toEqual([...FOCUSES].sort());
    expect(new Set(FOCUS_ORDER).size).toBe(FOCUS_ORDER.length);
  });

  it("intensity and volume are normalised to 0..1", () => {
    for (const f of FOCUSES) {
      expect(FOCUS_META[f].intensity).toBeGreaterThanOrEqual(0);
      expect(FOCUS_META[f].intensity).toBeLessThanOrEqual(1);
      expect(FOCUS_META[f].volume).toBeGreaterThanOrEqual(0);
      expect(FOCUS_META[f].volume).toBeLessThanOrEqual(1);
    }
  });

  it("encodes the classic curve: peaking = highest intensity, hypertrophy = highest volume", () => {
    const maxIntensity = Math.max(
      ...FOCUSES.map((f) => FOCUS_META[f].intensity),
    );
    const maxVolume = Math.max(...FOCUSES.map((f) => FOCUS_META[f].volume));
    expect(FOCUS_META.peaking.intensity).toBe(maxIntensity);
    expect(FOCUS_META.hypertrophy.volume).toBe(maxVolume);
    // Deload is the easy week: low on both axes.
    expect(FOCUS_META.deload.volume).toBeLessThan(FOCUS_META.strength.volume);
    expect(FOCUS_META.deload.intensity).toBeLessThan(
      FOCUS_META.strength.intensity,
    );
  });

  it("every focus has a CSS-var color and a label", () => {
    for (const f of FOCUSES) {
      expect(FOCUS_META[f].colorVar).toMatch(/^var\(--color-focus-/);
      expect(FOCUS_META[f].label.length).toBeGreaterThan(0);
      expect(FOCUS_META[f].short.length).toBeGreaterThan(0);
    }
  });

  it("presets only reference known focuses and are non-empty", () => {
    expect(MESOCYCLE_PRESETS.length).toBeGreaterThan(0);
    for (const preset of MESOCYCLE_PRESETS) {
      expect(preset.weeks.length).toBeGreaterThan(0);
      for (const week of preset.weeks) {
        expect(FOCUSES).toContain(week.focus);
      }
    }
  });
});
