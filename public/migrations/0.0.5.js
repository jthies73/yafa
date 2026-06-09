/**
 * Migration to 0.0.5.
 *
 * Each migration is an ES module whose default export receives the Dexie db
 * instance and applies any data changes needed for this version.
 */
export default async function migrate(db) {
  console.log("Running migration 0.0.5", db);
}
