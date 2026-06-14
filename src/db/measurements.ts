import { db } from "./db";
import type { MeasurementCategory, MeasurementEntry } from "./types";
// ----------------------------------------------
// Body measurements: types (what to track) + entries (timestamped values).
//
// Source of truth lives entirely in Dexie. "Bodyweight" is seeded as a sensible
// default measurement on first boot, but is otherwise an ordinary, editable and
// deletable type like any other.
// ----------------------------------------------

export const BODYWEIGHT_TYPE_ID = "bodyweight";

function uid(): string {
  return crypto.randomUUID();
}

/** Most recent entry for a type, or undefined when none logged yet. */
export async function latestEntry(
  typeId: string,
): Promise<MeasurementEntry | undefined> {
  const entries = await db.measurementEntries
    .where("measurementTypeId")
    .equals(typeId)
    .toArray();
  if (!entries.length) return undefined;
  return entries.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
}

// ---- Measurement types ----

export interface MeasurementTypeInput {
  name: string;
  category: MeasurementCategory;
}

export async function createMeasurementType(
  input: MeasurementTypeInput,
): Promise<string> {
  const id = uid();
  await db.measurementTypes.add({
    id,
    name: input.name.trim(),
    category: input.category,
    created_at: Date.now(),
  });
  return id;
}

/** Deletes a measurement type and all its entries. */
export async function deleteMeasurementType(id: string): Promise<void> {
  const type = await db.measurementTypes.get(id);
  if (!type) return;

  await db.transaction(
    "rw",
    [db.measurementTypes, db.measurementEntries],
    async () => {
      const entryIds = await db.measurementEntries
        .where("measurementTypeId")
        .equals(id)
        .primaryKeys();
      if (entryIds.length) await db.measurementEntries.bulkDelete(entryIds);
      await db.measurementTypes.delete(id);
    },
  );
}

// ---- Measurement entries ----

export async function logMeasurementEntry(input: {
  measurementTypeId: string;
  value: number; // already in source-of-truth units (kg / cm / %)
  timestamp: number;
}): Promise<string> {
  const id = uid();
  await db.measurementEntries.add({
    id,
    measurementTypeId: input.measurementTypeId,
    value: input.value,
    timestamp: input.timestamp,
  });
  return id;
}

export async function deleteMeasurementEntry(id: string): Promise<void> {
  await db.measurementEntries.delete(id);
}
