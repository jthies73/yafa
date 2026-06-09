import { describe, it, expect } from "vitest";
import manifest from "../../../public/migrations/manifest.json";

// public/migrations/ holds the manifest plus one ES module per data version.
// runMigrations() imports `<version>.js` for every version in the manifest, so
// the two must stay perfectly in sync: every listed version needs a file, and
// every migration file must be listed (or it would silently never run).
const fileModules = import.meta.glob("../../../public/migrations/*.js");
const fileVersions = Object.keys(fileModules).map((path) =>
  path.split("/").pop()!.replace(/\.js$/, ""),
);

describe("migration manifest ↔ files", () => {
  it("has a migration file for every version in the manifest", () => {
    const missing = manifest.versions.filter((v) => !fileVersions.includes(v));
    expect(missing, "manifest versions without a <version>.js file").toEqual(
      [],
    );
  });

  it("lists every migration file in the manifest", () => {
    const orphans = fileVersions.filter(
      (v) =>
        !manifest.versions.includes(v as (typeof manifest.versions)[number]),
    );
    expect(orphans, "migration files not listed in manifest.versions").toEqual(
      [],
    );
  });

  it("includes the 'latest' version in the versions list", () => {
    expect(manifest.versions).toContain(manifest.latest);
  });
});
