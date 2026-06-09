import { db } from "./db";
import { APP_VERSION } from "../config/version";

/**
 * Client-side data migrations.
 *
 * Migration files are hosted publicly by nginx under `/migrations/`, separate
 * from the app bundle, so new migrations can ship without rebuilding the app:
 *
 *   /migrations/manifest.json   — { latest, versions[] }
 *   /migrations/<version>.js    — ES module, `export default async (db) => {…}`
 *
 * The persisted "data version" (localStorage) records how far the local
 * IndexedDB has been migrated. On update we run every migration file with a
 * version greater than the current one, in ascending order, persisting after
 * each so an interrupted run resumes cleanly.
 */

const DATA_VERSION_KEY = "yafa:dataVersion";
const MIGRATIONS_BASE = "/migrations";

export interface MigrationManifest {
  latest: string;
  versions: string[];
}

type MigrateFn = (database: typeof db) => void | Promise<void>;
type MigrationModule = { default?: MigrateFn; migrate?: MigrateFn };

/** Compare two dotted versions ("1.2.0"). Returns <0, 0, or >0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

/** The version the local data has been migrated to (seeded on first run). */
export function getDataVersion(): string {
  const stored = localStorage.getItem(DATA_VERSION_KEY);
  if (stored) return stored;
  localStorage.setItem(DATA_VERSION_KEY, APP_VERSION);
  return APP_VERSION;
}

function setDataVersion(version: string): void {
  localStorage.setItem(DATA_VERSION_KEY, version);
}

export async function fetchManifest(): Promise<MigrationManifest> {
  const res = await fetch(`${MIGRATIONS_BASE}/manifest.json`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Could not load migration manifest (HTTP ${res.status})`);
  }
  const data = (await res.json()) as MigrationManifest;
  if (!data?.latest || !Array.isArray(data.versions)) {
    throw new Error("Migration manifest is malformed");
  }
  return data;
}

/** Versions to apply: newer than current, up to and including latest, ascending. */
export function pendingVersions(
  current: string,
  manifest: MigrationManifest,
): string[] {
  return manifest.versions
    .filter(
      (v) =>
        compareVersions(v, current) > 0 &&
        compareVersions(v, manifest.latest) <= 0,
    )
    .sort(compareVersions);
}

/**
 * Run all pending migrations sequentially. `onStep` is invoked with each
 * version just before it is applied (for progress UI).
 */
export async function runMigrations(
  current: string,
  manifest: MigrationManifest,
  onStep?: (version: string) => void,
): Promise<void> {
  for (const version of pendingVersions(current, manifest)) {
    onStep?.(version);
    const mod: MigrationModule = await import(
      /* @vite-ignore */ `${MIGRATIONS_BASE}/${version}.js`
    );
    const migrate = mod.default ?? mod.migrate;
    if (typeof migrate !== "function") {
      throw new Error(`Migration ${version} has no default export`);
    }
    await migrate(db);
    // Persist after each step so a failure mid-run resumes from here.
    setDataVersion(version);
  }
  // Land exactly on the manifest's target version.
  if (compareVersions(getDataVersion(), manifest.latest) < 0) {
    setDataVersion(manifest.latest);
  }
}
