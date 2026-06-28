import { describe, it, expect } from "vitest";
import type { PrescribedSet } from "../../engine/prescription";
import {
  prescribedSetEntry,
  projectCards,
  toSetRecord,
  type ExerciseCard,
  type SetEntry,
} from "../useWorkoutTracker";

const entry = (overrides: Partial<SetEntry> = {}): SetEntry => ({
  id: "entry-1",
  reps: "5",
  weight: "82.5",
  rpe: "9",
  done: true,
  completedAt: 1000,
  ...overrides,
});

const target: PrescribedSet = { reps: 5, rpe: 9, weight: 82.5, role: "top" };

const card = (overrides: Partial<ExerciseCard> = {}): ExerciseCard => ({
  id: "card-1",
  exerciseId: "ex-1",
  sets: [],
  ...overrides,
});

describe("toSetRecord", () => {
  it("takes targets from the prescription and actuals from the inputs", () => {
    const record = toSetRecord(
      entry({ reps: "4", weight: "80", rpe: "9.5", target }),
      0,
    );
    expect(record).toEqual({
      id: "entry-1",
      timestamp: 1000,
      targetReps: 5,
      actualReps: 4,
      targetWeight: 82.5,
      actualWeight: 80,
      targetRpe: 9,
      actualRpe: 9.5,
      failure: false,
    });
  });

  it("falls back to actuals when the row has no prescription", () => {
    const record = toSetRecord(entry({ rpe: "" }), 0);
    expect(record.targetReps).toBe(5);
    expect(record.targetWeight).toBe(82.5);
    expect(record.targetRpe).toBeUndefined();
    expect(record.actualRpe).toBeUndefined();
  });

  it("falls back to the actual weight when the prescription had none", () => {
    const record = toSetRecord(
      entry({ target: { ...target, weight: null, rpe: null } }),
      0,
    );
    expect(record.targetWeight).toBe(82.5);
    expect(record.targetRpe).toBeUndefined();
  });

  it("clamps timestamps monotonic so row order survives out-of-order completion", () => {
    const first = toSetRecord(entry({ completedAt: 3000 }), 0);
    const second = toSetRecord(entry({ completedAt: 1000 }), first.timestamp);
    expect(first.timestamp).toBe(3000);
    expect(second.timestamp).toBe(3001);
  });
});

describe("prescribedSetEntry", () => {
  it("prefills inputs from the prescription and keeps the target", () => {
    const row = prescribedSetEntry(target);
    expect(row.reps).toBe("5");
    expect(row.weight).toBe("82.5");
    expect(row.rpe).toBe("9");
    expect(row.target).toBe(target);
    expect(row.done).toBe(false);
    expect(row.completedAt).toBeNull();
  });

  it("leaves weight and RPE empty when the prescription has none", () => {
    const row = prescribedSetEntry({
      reps: 8,
      rpe: null,
      weight: null,
      role: "backoff",
    });
    expect(row.reps).toBe("8");
    expect(row.weight).toBe("");
    expect(row.rpe).toBe("");
  });
});

describe("projectCards", () => {
  it("keeps only completed sets and counts completed vs pending", () => {
    const result = projectCards([
      card({ sets: [entry(), entry({ id: "entry-2", done: false })] }),
    ]);
    expect(result.completed).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].sets).toHaveLength(1);
    expect(result.exercises[0].sets[0].id).toBe("entry-1");
  });

  it("carries a card's workout note onto the projected exercise", () => {
    const result = projectCards([
      card({ note: "felt heavy", sets: [entry()] }),
    ]);
    expect(result.exercises[0].note).toBe("felt heavy");
  });

  it("omits the note key when the card has none", () => {
    const result = projectCards([card({ sets: [entry()] })]);
    expect("note" in result.exercises[0]).toBe(false);
  });

  it("projects a note-only card with no completed sets (preserved at finish via sets.length || note)", () => {
    const result = projectCards([
      card({ note: "skipped — shoulder", sets: [] }),
    ]);
    expect(result.exercises[0]).toMatchObject({
      exerciseId: "ex-1",
      sets: [],
      note: "skipped — shoulder",
    });
    expect(result.completed).toBe(0);
  });
});
