// Portable app settings — the localStorage-backed preferences that travel inside
// a backup. The allowlist is the single source of truth: only these keys are
// written into a backup on export and the only keys honored on import. Device/
// session-only state (last route, install-banner dismissal, PWA flag) is
// deliberately excluded so it never leaks between devices.
//
// Pure module (no Vue, no direct `localStorage` reference) — the Storage is
// injected so this stays unit-testable and the DOM touch lives at the caller.

export type PortableSettings = Record<string, string>;

export const PORTABLE_SETTING_KEYS = [
  "yafa:theme",
  "yafa:weightUnit",
  "yafa:lengthUnit",
  "yafa:analyticsTimeframe",
  "yafa:exerciseChartTimeframe",
] as const;

/** Read the allowlisted keys present in `store` into a plain record (missing keys omitted). */
export function readPortableSettings(
  store: Pick<Storage, "getItem">,
): PortableSettings {
  const settings: PortableSettings = {};
  for (const key of PORTABLE_SETTING_KEYS) {
    const value = store.getItem(key);
    if (value !== null) settings[key] = value;
  }
  return settings;
}

/** Write back ONLY allowlisted keys present in `settings`; unknown keys and a missing object are ignored. */
export function applyPortableSettings(
  settings: PortableSettings | undefined,
  store: Pick<Storage, "setItem">,
): void {
  if (!settings) return;
  for (const key of PORTABLE_SETTING_KEYS) {
    const value = settings[key];
    if (typeof value === "string") store.setItem(key, value);
  }
}

/** Initialize settings defaults in store (localStorage) if they are not already set. */
export function initializeSettings(
  store: Pick<Storage, "getItem" | "setItem">,
): void {
  const defaults: Record<string, string> = {
    "yafa:theme": "light",
    "yafa:weightUnit": "kg",
    "yafa:lengthUnit": "cm",
    "yafa:analyticsTimeframe": "max",
    "yafa:exerciseChartTimeframe": "max",
  };

  if (typeof window !== "undefined" && window.matchMedia) {
    defaults["yafa:theme"] = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
  }

  for (const key of PORTABLE_SETTING_KEYS) {
    if (store.getItem(key) === null) {
      store.setItem(key, defaults[key]);
    }
  }
}
