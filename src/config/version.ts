/**
 * Single source of truth for the app's data version.
 *
 * Bump this on every release that ships a data migration, and publish a
 * matching `<version>.js` migration file (plus a manifest entry) on the server.
 * Fresh installs seed their persisted data version from this constant; existing
 * installs migrate from their persisted version up to the server's latest.
 */
export const APP_VERSION = "0.0.4";
