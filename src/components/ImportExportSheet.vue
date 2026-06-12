<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppBottomSheet from "./AppBottomSheet.vue";
import { exportData, importData, type BackupFile } from "../db/backup";

const { t } = useI18n();

const open = defineModel<boolean>("open", { required: true });

type Status = "idle" | "importing" | "done" | "error";
const status = ref<Status>("idle");
const message = ref<string | null>(null);
const pendingFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Reset transient state whenever the sheet is (re)opened.
watch(open, (isOpen) => {
  if (isOpen) {
    status.value = "idle";
    message.value = null;
    pendingFile.value = null;
  }
});

const exportBackup = async () => {
  status.value = "idle";
  message.value = null;
  try {
    const backup = await exportData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yafa-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    status.value = "done";
    message.value = t("importExport.backup_exported");
  } catch (err) {
    status.value = "error";
    message.value = (err as Error).message;
  }
};

const chooseFile = () => fileInput.value?.click();

const onFileSelected = (e: Event) => {
  const input = e.target as HTMLInputElement;
  pendingFile.value = input.files?.[0] ?? null;
  status.value = "idle";
  message.value = null;
  input.value = ""; // allow re-selecting the same file later
};

const confirmImport = async () => {
  if (!pendingFile.value) return;
  status.value = "importing";
  message.value = null;
  try {
    const text = await pendingFile.value.text();
    const backup = JSON.parse(text) as BackupFile;
    await importData(backup);
    // Reload so every live query rebinds to the restored data.
    location.reload();
  } catch (err) {
    status.value = "error";
    message.value = (err as Error).message;
    pendingFile.value = null;
  }
};

const close = () => {
  open.value = false;
};
</script>

<template>
  <AppBottomSheet
    v-model:open="open"
    :title="$t('importExport.title')"
    z-index="z-[55]"
  >
    <div class="flex flex-col gap-6 px-5 py-5">
      <!-- Description -->
      <p class="text-sm text-text-light dark:text-text-dark opacity-70">
        {{ $t("importExport.description") }}
      </p>

      <!-- Export -->
      <div class="flex flex-col gap-2">
        <span
          class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-60"
        >
          {{ $t("importExport.export") }}
        </span>
        <button
          class="flex items-center justify-center gap-2 rounded-lg border border-border-light dark:border-border-dark py-3 text-sm font-bold text-text-light dark:text-text-dark transition-colors duration-150 hover:bg-surface-light dark:hover:bg-surface-dark cursor-pointer"
          @click="exportBackup"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {{ $t("importExport.export_backup") }}
        </button>
      </div>

      <!-- Import -->
      <div class="flex flex-col gap-2">
        <span
          class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-60"
        >
          {{ $t("importExport.import") }}
        </span>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onFileSelected"
        />

        <!-- Step 1: choose a file -->
        <button
          v-if="!pendingFile"
          class="flex items-center justify-center gap-2 rounded-lg border border-border-light dark:border-border-dark py-3 text-sm font-bold text-text-light dark:text-text-dark transition-colors duration-150 hover:bg-surface-light dark:hover:bg-surface-dark cursor-pointer"
          @click="chooseFile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {{ $t("importExport.choose_backup_file") }}
        </button>

        <!-- Step 2: confirm destructive replace -->
        <div v-else class="flex flex-col gap-3">
          <i18n-t
            keypath="importExport.import_warning"
            tag="p"
            scope="global"
            class="text-sm text-red-500"
          >
            <template #file>
              <span class="font-semibold">{{ pendingFile.name }}</span>
            </template>
          </i18n-t>
          <div class="flex gap-3">
            <button
              class="flex-1 rounded-lg border border-border-light dark:border-border-dark py-2.5 text-sm font-bold text-text-light dark:text-text-dark transition-colors duration-150 hover:bg-surface-light dark:hover:bg-surface-dark cursor-pointer disabled:opacity-40"
              :disabled="status === 'importing'"
              @click="pendingFile = null"
            >
              {{ $t("common.cancel") }}
            </button>
            <button
              class="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white transition-colors duration-150 hover:bg-red-500/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="status === 'importing'"
              @click="confirmImport"
            >
              {{
                status === "importing"
                  ? $t("importExport.importing")
                  : $t("importExport.replace_data")
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- Status message -->
      <p
        v-if="message"
        class="text-sm"
        :class="status === 'error' ? 'text-red-500' : 'text-accent'"
      >
        {{ message }}
      </p>
    </div>

    <template #footer>
      <button
        class="flex-1 rounded-lg border border-border-light dark:border-border-dark py-3 text-sm font-bold text-text-light dark:text-text-dark transition-colors duration-150 hover:bg-surface-light dark:hover:bg-surface-dark cursor-pointer"
        @click="close"
      >
        {{ $t("common.close") }}
      </button>
    </template>
  </AppBottomSheet>
</template>
