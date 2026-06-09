/**
 * Migration to 0.1.0 — baseline.
 *
 * Each migration is an ES module whose default export receives the Dexie db
 * instance and applies any data changes needed for this version. This is the
 * current baseline; future releases add a `<version>.js` here alongside an
 * entry in manifest.json.
 */
export default async function migrate(db) {
  console.log("Running migration 0.1.0", db);
}
