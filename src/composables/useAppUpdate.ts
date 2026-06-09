import { ref } from "vue";
import {
  fetchManifest,
  getDataVersion,
  pendingVersions,
  runMigrations,
  type MigrationManifest,
} from "../db/migrations";
import { usePwaUpdate } from "./usePwaUpdate";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "updating"
  | "error";

// Shared, single-instance state so the sheet reflects the same status anywhere.
const currentVersion = ref(getDataVersion());
const latestVersion = ref<string | null>(null);
const status = ref<UpdateStatus>("idle");
const applyingVersion = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

let manifest: MigrationManifest | null = null;

export function useAppUpdate() {
  // Importing this keeps the service worker registered and lets a completed
  // update also pull the new app code.
  const { needRefresh, update: applyCodeUpdate } = usePwaUpdate();

  async function check(): Promise<void> {
    if (status.value === "updating") return;
    status.value = "checking";
    errorMessage.value = null;
    try {
      manifest = await fetchManifest();
      currentVersion.value = getDataVersion();
      latestVersion.value = manifest.latest;
      const hasPending =
        pendingVersions(currentVersion.value, manifest).length > 0;
      status.value =
        hasPending || needRefresh.value ? "available" : "up-to-date";
    } catch (err) {
      errorMessage.value = (err as Error).message;
      status.value = "error";
    }
  }

  async function runUpdate(): Promise<void> {
    if (!manifest || status.value === "updating") return;
    status.value = "updating";
    errorMessage.value = null;
    try {
      await runMigrations(currentVersion.value, manifest, (v) => {
        applyingVersion.value = v;
      });
      currentVersion.value = getDataVersion();
      // Pull the new app code too, then reload. updateServiceWorker reloads on
      // activation; with no waiting worker we reload ourselves.
      if (needRefresh.value) {
        await applyCodeUpdate();
      } else {
        location.reload();
      }
    } catch (err) {
      errorMessage.value = (err as Error).message;
      status.value = "error";
      applyingVersion.value = null;
    }
  }

  return {
    currentVersion,
    latestVersion,
    status,
    applyingVersion,
    errorMessage,
    check,
    runUpdate,
  };
}
