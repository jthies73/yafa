import { describe, it, expect } from "vitest";
import { deepEqual } from "../deepEqual";

describe("deepEqual", () => {
  it("treats identical primitives as equal", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
  });

  it("distinguishes diverging primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(null, 0)).toBe(false);
    expect(deepEqual(1, "1")).toBe(false);
  });

  it("considers NaN equal to itself", () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
  });

  it("compares nested objects deeply", () => {
    const a = { id: "x", nested: { a: 1, b: [1, 2, 3] } };
    const b = { id: "x", nested: { a: 1, b: [1, 2, 3] } };
    expect(deepEqual(a, b)).toBe(true);
  });

  it("detects a diverging scalar field", () => {
    const a = { id: "x", name: "Squat", created_at: 1 };
    const b = { id: "x", name: "Squat", created_at: 2 };
    expect(deepEqual(a, b)).toBe(false);
  });

  it("is independent of key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("treats a missing key and an undefined value as equal", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });

  it("treats a missing key and a defined value as different", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("compares arrays by length then ordered elements", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it("does not equate an array with a plain object", () => {
    expect(deepEqual([], {})).toBe(false);
  });

  it("handles arrays of objects", () => {
    const a = [{ exerciseId: "e1", sets: [{ reps: 5 }] }];
    const b = [{ exerciseId: "e1", sets: [{ reps: 5 }] }];
    expect(deepEqual(a, b)).toBe(true);

    const c = [{ exerciseId: "e1", sets: [{ reps: 6 }] }];
    expect(deepEqual(a, c)).toBe(false);
  });
});
