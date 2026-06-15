import { describe, it, expect } from "vitest";
import { proposeRecalibrationE1rm } from "../recalibration";

describe("recalibration proposal", () => {
  it("returns null when within the ±10% tolerance", () => {
    expect(proposeRecalibrationE1rm(100, 100)).toBeNull();
    expect(proposeRecalibrationE1rm(100, 109)).toBeNull(); // +9%
    expect(proposeRecalibrationE1rm(100, 91)).toBeNull(); // −9%
  });

  it("moves two-thirds of the way toward an upward divergence", () => {
    // +15%: 100 + (2/3)(115 − 100) = 110
    expect(proposeRecalibrationE1rm(100, 115)).toBeCloseTo(110);
  });

  it("moves two-thirds of the way toward a downward divergence", () => {
    // −20%: 100 + (2/3)(80 − 100) = 86.7
    expect(proposeRecalibrationE1rm(100, 80)).toBeCloseTo(86.7);
  });

  it("triggers once divergence clears the threshold, either direction", () => {
    expect(proposeRecalibrationE1rm(100, 112)).toBeCloseTo(108); // +12%
    expect(proposeRecalibrationE1rm(100, 88)).toBeCloseTo(92); // −12%
  });

  it("returns null without a working e1RM to diverge from", () => {
    expect(proposeRecalibrationE1rm(null, 120)).toBeNull();
    expect(proposeRecalibrationE1rm(0, 120)).toBeNull();
    expect(proposeRecalibrationE1rm(100, null)).toBeNull();
  });
});
