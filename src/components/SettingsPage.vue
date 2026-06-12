<script setup lang="ts">
import { ref, onMounted } from "vue";
import { DEFAULT_RPE_MATRIX } from "../db/rpeMatrix";
import RpeMatrixTable from "./RpeMatrixTable.vue";
import { useWeightUnit, type WeightUnit } from "../composables/useWeightUnit";
import { useLengthUnit, type LengthUnit } from "../composables/useLengthUnit";
import { setLocale, type Locale } from "../i18n";
import { useI18n } from "vue-i18n";
import AppBottomSheet from "./AppBottomSheet.vue";

const { locale } = useI18n();

const isDark = ref(false);
const rpeMatrix = DEFAULT_RPE_MATRIX;

// Reactive, app-wide weight unit. Switching it reconverts every weight in the
// app (kg stays the stored source of truth).
const { label: weightUnit, setUnit } = useWeightUnit();

onMounted(() => {
  const savedTheme = localStorage.getItem("yafa:theme");
  isDark.value =
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("yafa:theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("yafa:theme", "light");
  }
};

const { label: lengthUnit, setUnit: setLengthUnitRaw } = useLengthUnit();

const setWeightUnit = (unit: WeightUnit) => setUnit(unit);
const setLengthUnit = (unit: LengthUnit) => setLengthUnitRaw(unit);

const toggleWeightUnit = () => {
  setWeightUnit(weightUnit.value === "kg" ? "lbs" : "kg");
};
const toggleLengthUnit = () => {
  setLengthUnit(lengthUnit.value === "cm" ? "in" : "cm");
};

// ── Language picker ──────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS: { code: Locale; nativeName: string }[] = [
  { code: "en", nativeName: "English" },
  { code: "de", nativeName: "Deutsch" },
];

const showLangPicker = ref(false);

const selectLanguage = (code: Locale) => {
  setLocale(code);
  showLangPicker.value = false;
};

const currentLanguageName = () =>
  LANGUAGE_OPTIONS.find((l) => l.code === locale.value)?.nativeName ?? locale.value;
</script>

<template>
  <div class="p-6 relative min-h-full flex flex-col animate-fade-in">
    <!-- Header Section -->
    <div class="mb-6">
      <h1
        class="text-3xl font-bold tracking-tight text-text-h-light dark:text-text-h-dark"
      >
        {{ $t("settings.title") }}
      </h1>
      <p class="text-sm text-text-light dark:text-text-dark opacity-70 mt-1">
        {{ $t("settings.subtitle") }}
      </p>
    </div>

    <div class="flex flex-col gap-6 max-w-4xl">
      <!-- Preferences Card -->
      <div
        class="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 shadow-sm flex flex-col"
      >
        <h2
          class="text-lg font-bold text-text-h-light dark:text-text-h-dark mb-4 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-accent"
          >
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {{ $t("settings.preferences") }}
        </h2>

        <!-- Theme Option -->
        <div
          class="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark"
        >
          <div>
            <div
              class="font-semibold text-text-h-light dark:text-text-h-dark text-sm sm:text-base"
            >
              {{ $t("settings.dark_mode") }}
            </div>
            <div class="text-xs text-text-light dark:text-text-dark opacity-60">
              {{ $t("settings.dark_mode_desc") }}
            </div>
          </div>
          <button
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            :class="
              isDark ? 'bg-accent' : 'bg-border-light dark:bg-border-dark'
            "
            :aria-label="$t('settings.toggle_dark_mode')"
            @click="toggleTheme"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="isDark ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>

        <!-- Weight Units -->
        <div
          class="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark"
        >
          <div>
            <div
              class="font-semibold text-text-h-light dark:text-text-h-dark text-sm sm:text-base"
            >
              {{ $t("settings.weight_units") }}
            </div>
            <div class="text-xs text-text-light dark:text-text-dark opacity-60">
              {{ $t("settings.weight_units_desc") }}
            </div>
          </div>
          <button
            type="button"
            class="flex items-center border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 w-24 cursor-pointer select-none"
            @click="toggleWeightUnit"
            role="switch"
            :aria-checked="weightUnit === 'lbs'"
            :aria-label="$t('settings.toggle_weight_unit')"
          >
            <span
              class="flex-1 text-center py-1.5 text-xs font-semibold transition-colors duration-150"
              :class="
                weightUnit === 'kg'
                  ? 'bg-accent text-bg-dark font-bold'
                  : 'text-text-h-light dark:text-text-h-dark hover:bg-surface-light-hover/40 dark:hover:bg-surface-dark-hover/40'
              "
            >
              kg
            </span>
            <span
              class="flex-1 text-center py-1.5 text-xs font-semibold transition-colors duration-150"
              :class="
                weightUnit === 'lbs'
                  ? 'bg-accent text-bg-dark font-bold'
                  : 'text-text-h-light dark:text-text-h-dark hover:bg-surface-light-hover/40 dark:hover:bg-surface-dark-hover/40'
              "
            >
              lbs
            </span>
          </button>
        </div>

        <!-- Length Units -->
        <div
          class="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark"
        >
          <div>
            <div
              class="font-semibold text-text-h-light dark:text-text-h-dark text-sm sm:text-base"
            >
              {{ $t("settings.length_units") }}
            </div>
            <div class="text-xs text-text-light dark:text-text-dark opacity-60">
              {{ $t("settings.length_units_desc") }}
            </div>
          </div>
          <button
            type="button"
            class="flex items-center border border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 w-24 cursor-pointer select-none"
            @click="toggleLengthUnit"
            role="switch"
            :aria-checked="lengthUnit === 'in'"
            :aria-label="$t('settings.toggle_length_unit')"
          >
            <span
              class="flex-1 text-center py-1.5 text-xs font-semibold transition-colors duration-150"
              :class="
                lengthUnit === 'cm'
                  ? 'bg-accent text-bg-dark font-bold'
                  : 'text-text-h-light dark:text-text-h-dark hover:bg-surface-light-hover/40 dark:hover:bg-surface-dark-hover/40'
              "
            >
              cm
            </span>
            <span
              class="flex-1 text-center py-1.5 text-xs font-semibold transition-colors duration-150"
              :class="
                lengthUnit === 'in'
                  ? 'bg-accent text-bg-dark font-bold'
                  : 'text-text-h-light dark:text-text-h-dark hover:bg-surface-light-hover/40 dark:hover:bg-surface-dark-hover/40'
              "
            >
              in
            </span>
          </button>
        </div>

        <!-- Language -->
        <div class="flex items-center justify-between py-3">
          <div>
            <div
              class="font-semibold text-text-h-light dark:text-text-h-dark text-sm sm:text-base"
            >
              {{ $t("settings.language") }}
            </div>
            <div class="text-xs text-text-light dark:text-text-dark opacity-60">
              {{ $t("settings.language_desc") }}
            </div>
          </div>
          <button
            type="button"
            class="flex items-center justify-between border border-border-light dark:border-border-dark rounded-lg bg-black/5 dark:bg-white/5 px-3 py-1.5 w-24 cursor-pointer select-none hover:bg-surface-light-hover/40 dark:hover:bg-surface-dark-hover/40 transition-colors duration-150"
            :aria-label="$t('settings.select_language')"
            @click="showLangPicker = true"
          >
            <span
              class="text-xs font-semibold text-text-h-light dark:text-text-h-dark"
            >
              {{ currentLanguageName() }}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-text-light dark:text-text-dark opacity-50"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Global RPE Matrix Card -->
      <div
        class="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-6 shadow-sm flex flex-col"
      >
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="min-w-0">
            <h2
              class="text-lg font-bold text-text-h-light dark:text-text-h-dark flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-accent"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="9" x2="9" y2="21" />
              </svg>
              {{ $t("settings.global_rpe_matrix") }}
            </h2>
            <p
              class="text-xs text-text-light dark:text-text-dark opacity-60 mt-1"
            >
              {{ $t("settings.global_rpe_matrix_desc") }}
            </p>
          </div>
        </div>

        <RpeMatrixTable :model-value="rpeMatrix" />
      </div>
    </div>
  </div>

  <!-- Language picker bottom sheet -->
  <AppBottomSheet v-model:open="showLangPicker">
    <template #title>
      <h2 class="text-lg font-bold text-text-h-light dark:text-text-h-dark">
        {{ $t("settings.select_language") }}
      </h2>
    </template>

    <div class="flex flex-col gap-2 px-5 py-5 pb-8">
      <label
        v-for="lang in LANGUAGE_OPTIONS"
        :key="lang.code"
        class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors"
        :class="
          locale === lang.code
            ? 'bg-accent/10 border-accent/30'
            : 'border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark'
        "
        @click="selectLanguage(lang.code)"
      >
        <span
          class="text-sm font-semibold"
          :class="
            locale === lang.code
              ? 'text-accent'
              : 'text-text-h-light dark:text-text-h-dark'
          "
        >
          {{ lang.nativeName }}
        </span>
        <svg
          v-if="locale === lang.code"
          class="w-5 h-5 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="3"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </label>
    </div>
  </AppBottomSheet>
</template>
