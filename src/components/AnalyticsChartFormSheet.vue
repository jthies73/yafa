<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { liveQuery } from "dexie";
import { db } from "../db/db";
import type {
  AnalyticsBucket,
  AnalyticsChartConfig,
  AnalyticsMetric,
  AnalyticsSourceKind,
  Exercise,
  MeasurementType,
} from "../db/types";
import type { ChartConfigInput } from "../db/analyticsCharts";
import { createExercise, type ExerciseInput } from "../db/repository";
import { activeMesocycleSpec } from "../analytics/service";
import { MUSCLE_GROUPS } from "../utils/constants";
import AppBottomSheet from "./AppBottomSheet.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import ExercisePickerSheet from "./ExercisePickerSheet.vue";
import ExerciseFormSheet from "./ExerciseFormSheet.vue";
import ListPickerSheet, { type ListPickerOption } from "./ListPickerSheet.vue";
import { useSystemNames } from "../composables/useSystemNames";

const open = defineModel<boolean>("open", { required: true });
const { t } = useI18n();
const { muscleLabel, exerciseName, measurementTypeName } = useSystemNames();

const props = defineProps<{
  // null ⇒ creating a new chart; otherwise the config being edited.
  editing: AnalyticsChartConfig | null;
}>();

const emit = defineEmits<{
  (e: "save", input: ChartConfigInput): void;
  (e: "delete"): void;
}>();

// --- Form state ---
const sourceKind = ref<AnalyticsSourceKind>("global");
const muscleGroup = ref<string | null>(null);
const exerciseId = ref<string | null>(null);
const measurementTypeId = ref<string | null>(null);
const metric = ref<AnalyticsMetric>("sets");
const bucket = ref<AnalyticsBucket>("week");

// Reset (or prefill) the form each time the sheet opens.
watch(open, (isOpen) => {
  if (!isOpen) return;
  const editing = props.editing;
  sourceKind.value = editing?.sourceKind ?? "global";
  muscleGroup.value = editing?.muscleGroup ?? null;
  exerciseId.value = editing?.exerciseId ?? null;
  measurementTypeId.value = editing?.measurementTypeId ?? null;
  metric.value = editing?.metric ?? "sets";
  bucket.value = editing?.bucket ?? "week";
});

// --- Live data for selection labels and pickers ---
const exercises = ref<Exercise[]>([]);
const measurementTypes = ref<MeasurementType[]>([]);
const hasMesocycle = ref(false);
const subscriptions: { unsubscribe(): void }[] = [];

onMounted(() => {
  subscriptions.push(
    liveQuery(() => db.exercises.orderBy("name").toArray()).subscribe({
      next: (rows) => (exercises.value = rows),
      error: (err) => console.error("Error loading exercises:", err),
    }),
    liveQuery(() => db.measurementTypes.toArray()).subscribe({
      next: (rows) =>
        (measurementTypes.value = rows.sort((a, b) =>
          a.name.localeCompare(b.name),
        )),
      error: (err) => console.error("Error loading measurement types:", err),
    }),
    // Tracks db.plans, so toggling a plan's mesocycle updates availability live.
    liveQuery(() => activeMesocycleSpec()).subscribe({
      next: (spec) => (hasMesocycle.value = spec !== undefined),
      error: (err) => console.error("Error loading mesocycle:", err),
    }),
  );
});

onUnmounted(() => subscriptions.forEach((s) => s.unsubscribe()));

// --- Option matrices (availability per the spec) ---
const SOURCE_OPTIONS: { value: AnalyticsSourceKind; labelKey: string }[] = [
  { value: "global", labelKey: "analyticsForm.source_global" },
  { value: "muscle", labelKey: "analyticsForm.source_muscle" },
  { value: "exercise", labelKey: "analyticsForm.source_exercise" },
  { value: "measurement", labelKey: "analyticsForm.source_measurement" },
];

interface ToggleOption<T extends string> {
  value: T;
  labelKey: string;
  enabled: boolean;
}

const metricOptions = computed<ToggleOption<AnalyticsMetric>[]>(() => [
  // "Number of Workouts" is a session count — only Global describes whole
  // sessions; e1RM only exists for a single exercise's load history.
  {
    value: "workouts",
    labelKey: "analyticsForm.metric_workouts",
    enabled: sourceKind.value === "global",
  },
  { value: "sets", labelKey: "analyticsForm.metric_sets", enabled: true },
  { value: "reps", labelKey: "analyticsForm.metric_reps", enabled: true },
  { value: "volume", labelKey: "analyticsForm.metric_volume", enabled: true },
  { value: "e1rm", labelKey: "analyticsForm.metric_e1rm", enabled: sourceKind.value === "exercise" },
]);

const bucketOptions = computed<ToggleOption<AnalyticsBucket>[]>(() => [
  { value: "session", labelKey: "analyticsForm.bucket_session", enabled: true },
  { value: "week", labelKey: "analyticsForm.bucket_week", enabled: true },
  // e1RM: max-per-week is the finest useful bucket — monthly or mesocycle
  // aggregation compresses the variance that makes the trend meaningful.
  { value: "month", labelKey: "analyticsForm.bucket_month", enabled: metric.value !== "e1rm" },
  {
    value: "mesocycle",
    labelKey: "analyticsForm.bucket_mesocycle",
    enabled: metric.value !== "e1rm" && hasMesocycle.value,
  },
]);

// Coerce dependent fields whenever a selection invalidates them.
watch(sourceKind, (kind) => {
  if (kind === "measurement") {
    // Measurements have no derived metrics — the y-axis is the raw value.
    metric.value = "value";
    return;
  }
  if (
    metric.value === "value" ||
    (metric.value === "workouts" && kind !== "global") ||
    (metric.value === "e1rm" && kind !== "exercise")
  ) {
    metric.value = "sets";
  }
});

watch([metric, bucketOptions], () => {
  const current = bucketOptions.value.find((o) => o.value === bucket.value);
  if (current && !current.enabled) bucket.value = "week";
});

// --- Source selection (pickers) ---
const showMusclePicker = ref(false);
const showExercisePicker = ref(false);
const showMeasurementPicker = ref(false);
const showExerciseForm = ref(false);

const muscleOptions = computed<ListPickerOption[]>(() =>
  MUSCLE_GROUPS.map((m) => ({ value: m, label: muscleLabel(m) })),
);

const categoryLabelKey: Record<MeasurementType["category"], string> = {
  WEIGHT: "measurementTypeForm.category_weight",
  LENGTH: "measurementTypeForm.category_length",
  PERCENTAGE: "measurementTypeForm.category_percentage",
};

const measurementOptions = computed<ListPickerOption[]>(() =>
  measurementTypes.value.map((mType) => ({
    value: mType.id,
    label: measurementTypeName(mType),
    sub: t(categoryLabelKey[mType.category]),
  })),
);

const selectedExerciseName = computed(() => {
  const ex = exercises.value.find((e) => e.id === exerciseId.value);
  return ex ? exerciseName(ex) : null;
});
const selectedMeasurementName = computed(() => {
  const ms = measurementTypes.value.find((t) => t.id === measurementTypeId.value);
  return ms ? measurementTypeName(ms) : null;
});

const selectionLabel = computed<string | null>(() => {
  switch (sourceKind.value) {
    case "muscle":
      return muscleGroup.value ? muscleLabel(muscleGroup.value) : null;
    case "exercise":
      return selectedExerciseName.value;
    case "measurement":
      return selectedMeasurementName.value;
    default:
      return null;
  }
});

const openSelectionPicker = () => {
  if (sourceKind.value === "muscle") showMusclePicker.value = true;
  else if (sourceKind.value === "exercise") showExercisePicker.value = true;
  else if (sourceKind.value === "measurement")
    showMeasurementPicker.value = true;
};

const handleSelectExercise = (exercise: Exercise) => {
  exerciseId.value = exercise.id;
  showExercisePicker.value = false;
};

const handleCreateExercise = () => {
  showExercisePicker.value = false;
  showExerciseForm.value = true;
};

const handleSaveNewExercise = async (input: ExerciseInput) => {
  exerciseId.value = await createExercise(input);
  showExerciseForm.value = false;
};

// --- Save / delete ---
const canSave = computed(() => {
  switch (sourceKind.value) {
    case "muscle":
      return muscleGroup.value !== null;
    case "exercise":
      return exerciseId.value !== null;
    case "measurement":
      return measurementTypeId.value !== null;
    default:
      return true;
  }
});

const save = () => {
  if (!canSave.value) return;
  emit("save", {
    sourceKind: sourceKind.value,
    muscleGroup: muscleGroup.value ?? undefined,
    exerciseId: exerciseId.value ?? undefined,
    measurementTypeId: measurementTypeId.value ?? undefined,
    metric: metric.value,
    bucket: bucket.value,
  });
};

const confirmDeleteOpen = ref(false);
</script>

<template>
  <AppBottomSheet v-model:open="open">
    <template #title>
      <div class="flex items-center justify-between gap-4 w-full">
        <h2
          class="text-lg font-bold text-text-h-light dark:text-text-h-dark truncate"
        >
          {{ editing ? $t("analyticsForm.edit_chart") : $t("analyticsForm.new_chart") }}
        </h2>
        <button
          v-if="editing"
          type="button"
          class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-500 hover:bg-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/25 transition-colors duration-150 cursor-pointer shrink-0"
          @click="confirmDeleteOpen = true"
        >
          {{ $t("common.delete") }}
        </button>
      </div>
    </template>
    <div class="flex flex-col gap-5 px-5 py-4">
      <!-- Data source -->
      <div class="flex flex-col gap-2">
        <label
          class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-60"
        >
          {{ $t("analyticsForm.data_source") }}
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="option in SOURCE_OPTIONS"
            :key="option.value"
            class="rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors duration-150 cursor-pointer"
            :class="
              sourceKind === option.value
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
            "
            @click="sourceKind = option.value"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>
      </div>

      <!-- Scope selection (muscle / exercise / measurement) -->
      <div v-if="sourceKind !== 'global'" class="flex flex-col gap-2">
        <label
          class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-60"
        >
          {{
            sourceKind === "muscle"
              ? $t("analyticsForm.source_muscle")
              : sourceKind === "exercise"
                ? $t("analyticsForm.source_exercise")
                : $t("analyticsForm.source_measurement")
          }}
        </label>
        <button
          class="flex items-center justify-between gap-3 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-surface-light-hover dark:hover:bg-surface-dark-hover cursor-pointer"
          @click="openSelectionPicker"
        >
          <span
            class="truncate font-semibold"
            :class="
              selectionLabel
                ? 'text-text-h-light dark:text-text-h-dark'
                : 'text-text-light dark:text-text-dark opacity-50'
            "
          >
            {{
              selectionLabel ??
              (sourceKind === "muscle"
                ? $t("analyticsForm.select_muscle")
                : sourceKind === "exercise"
                  ? $t("analyticsForm.select_exercise")
                  : $t("analyticsForm.select_measurement"))
            }}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 text-text-light dark:text-text-dark opacity-50"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      <!-- Metric (hidden for measurements — locked to the raw logged value) -->
      <div v-if="sourceKind !== 'measurement'" class="flex flex-col gap-2">
        <label
          class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-60"
        >
          {{ $t("analyticsForm.metric") }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in metricOptions"
            v-show="option.enabled"
            :key="option.value"
            class="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer"
            :class="
              metric === option.value
                ? 'bg-accent text-bg-dark'
                : 'border border-border-light dark:border-border-dark text-text-light dark:text-text-dark hover:bg-surface-light dark:hover:bg-surface-dark'
            "
            @click="metric = option.value"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>
      </div>

      <!-- Time aggregation -->
      <div class="flex flex-col gap-2">
        <label
          class="text-xs font-bold uppercase tracking-wider text-text-light dark:text-text-dark opacity-60"
        >
          {{ $t("analyticsForm.time_scale") }}
        </label>
        <div
          class="flex gap-1 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-1"
        >
          <button
            v-for="option in bucketOptions"
            :key="option.value"
            :disabled="!option.enabled"
            class="flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors duration-150"
            :class="
              bucket === option.value
                ? 'bg-accent text-bg-dark cursor-pointer'
                : option.enabled
                  ? 'text-text-light dark:text-text-dark hover:text-text-h-light dark:hover:text-text-h-dark cursor-pointer'
                  : 'text-text-light dark:text-text-dark opacity-30 cursor-not-allowed'
            "
            @click="bucket = option.value"
          >
            {{ $t(option.labelKey) }}
          </button>
        </div>
        <p
          v-if="!hasMesocycle && metric !== 'e1rm'"
          class="text-xs text-text-light dark:text-text-dark opacity-50"
        >
          {{ $t("analyticsForm.mesocycle_hint") }}
        </p>
      </div>
    </div>

    <template #footer>
      <button
        class="flex-1 rounded-lg border border-border-light dark:border-border-dark py-2.5 text-sm font-bold text-text-light dark:text-text-dark transition-colors duration-150 hover:bg-surface-light dark:hover:bg-surface-dark cursor-pointer"
        @click="open = false"
      >
        {{ $t("common.cancel") }}
      </button>
      <button
        class="flex-1 rounded-lg bg-accent py-2.5 text-sm font-bold text-bg-dark transition-colors duration-150 hover:bg-accent-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canSave"
        @click="save"
      >
        {{ $t("common.save") }}
      </button>
    </template>
  </AppBottomSheet>

  <!-- Pickers stack above the form sheet -->
  <ListPickerSheet
    v-model:open="showMusclePicker"
    :title="$t('analyticsForm.select_muscle_title')"
    :options="muscleOptions"
    @select="
      (value) => {
        muscleGroup = value;
        showMusclePicker = false;
      }
    "
  />

  <ListPickerSheet
    v-model:open="showMeasurementPicker"
    :title="$t('analyticsForm.select_measurement_title')"
    :options="measurementOptions"
    @select="
      (value) => {
        measurementTypeId = value;
        showMeasurementPicker = false;
      }
    "
  />

  <ExercisePickerSheet
    v-model:open="showExercisePicker"
    @select="handleSelectExercise"
    @create="handleCreateExercise"
  />

  <ExerciseFormSheet
    v-model:open="showExerciseForm"
    :is-editing="false"
    @save="handleSaveNewExercise"
  />

  <ConfirmDialog
    v-model:open="confirmDeleteOpen"
    :title="$t('analyticsForm.delete_confirm_title')"
    :message="$t('analyticsForm.delete_confirm_msg')"
    :confirm-label="$t('common.delete')"
    @confirm="emit('delete')"
  />
</template>
