/**
 * Structural equality for JSON-shaped data. Tuned for comparing a local Dexie
 * row against its counterpart parsed from a backup file: because `JSON.parse`
 * drops keys whose value was `undefined`, a missing key and an `undefined`
 * value are treated as equal. Object key order is irrelevant; arrays compare
 * by length then ordered elements. Primitives compare with `Object.is`
 * (so `NaN === NaN`).
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false; // primitives that weren't Object.is-equal, or null vs object
  }

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;

  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  // Union of keys whose value is defined — missing key == undefined value.
  const keys = new Set<string>();
  for (const k of Object.keys(ao)) if (ao[k] !== undefined) keys.add(k);
  for (const k of Object.keys(bo)) if (bo[k] !== undefined) keys.add(k);

  for (const k of keys) {
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}
