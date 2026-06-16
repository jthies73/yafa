import type {
  PeriodizationFocus,
  MesocycleWeek,
  ProgressionModelType,
} from "../db/types";

/**
 * Single source of truth for periodization focuses.
 *
 * `intensity` and `volume` (0..1) are *approximate* values used only to draw the
 * mesocycle chart — they sketch the canonical curve (volume tapers while
 * intensity climbs to a peak, then a deload drops both). The multipliers the
 * workout engine actually applies per week live in `FOCUS_MODIFIERS` below.
 *
 * `colorVar` references a CSS token from `style.css` `@theme`. SVG fills are
 * data-driven (one fill per focus), which Tailwind utility classes can't express
 * from runtime data, so the chart applies these via inline `var(--color-focus-*)`.
 */
export interface FocusMeta {
  label: string;
  short: string;
  intensity: number; // 0..1, visualization only
  volume: number; // 0..1, visualization only
  colorVar: string;
}

export const FOCUS_META: Record<PeriodizationFocus, FocusMeta> = {
  hypertrophy: {
    label: "Hypertrophy",
    short: "Hyp",
    intensity: 0.55,
    volume: 0.95,
    colorVar: "var(--color-focus-hypertrophy)",
  },
  strength: {
    label: "Strength",
    short: "Str",
    intensity: 0.8,
    volume: 0.65,
    colorVar: "var(--color-focus-strength)",
  },
  peaking: {
    label: "Peaking",
    short: "Peak",
    intensity: 1.0,
    volume: 0.3,
    colorVar: "var(--color-focus-peaking)",
  },
  deload: {
    label: "Deload",
    short: "DL",
    intensity: 0.4,
    volume: 0.2,
    colorVar: "var(--color-focus-deload)",
  },
};

/**
 * Multipliers a mesocycle week applies to an exercise's goal: `volume` scales
 * set/rep targets, `intensity` scales the target RPE. Values hover around 1.0
 * because they multiply the user's configured targets, not absolute loads.
 *
 * Deload is deliberately NOT special-cased anywhere in the engine — it is an
 * ordinary week whose multipliers simply make the goal easy. This keeps the
 * prescription pipeline uniform and lets users tune deloads like any other week.
 */
export interface FocusModifiers {
  volume: number;
  intensity: number;
}

export const FOCUS_MODIFIERS: Record<PeriodizationFocus, FocusModifiers> = {
  hypertrophy: { volume: 1.15, intensity: 0.95 },
  strength: { volume: 1.0, intensity: 1.0 },
  peaking: { volume: 0.7, intensity: 1.05 },
  deload: { volume: 0.5, intensity: 0.85 },
};

/**
 * Param keys that periodization can modify — and therefore that the user may
 * lock in the ExerciseConfigSheet — per progression model. Keys not listed here
 * are never affected by periodization (e.g. double progression's rep range is
 * engine-driven state, so the mesocycle must not fight the model's own rep
 * advancement). Shared between the config sheet UI and the workout engine so
 * the two cannot disagree about what a lock protects.
 */
export const LOCKABLE_FIELDS: Record<ProgressionModelType, string[]> = {
  linear: ["targetSets", "targetReps", "targetRpe"],
  double: ["targetSets"],
  topset_backoff: ["topSetTargetReps", "backOffSets", "topSetTargetRpe"],
  none: ["targetSets", "targetReps", "targetRpe"],
};

/** Display/selection order for the focuses. */
export const FOCUS_ORDER: PeriodizationFocus[] = [
  "hypertrophy",
  "strength",
  "peaking",
  "deload",
];

const weeksOf = (focuses: PeriodizationFocus[]): MesocycleWeek[] =>
  focuses.map((focus) => ({ focus }));

/** One-click starting points surfaced as preset buttons in the editor. */
export const MESOCYCLE_PRESETS: { name: string; weeks: MesocycleWeek[] }[] = [
  {
    name: "Classic 6-week peak",
    weeks: weeksOf([
      "hypertrophy",
      "hypertrophy",
      "strength",
      "strength",
      "peaking",
      "deload",
    ]),
  },
  {
    name: "4-week accumulation",
    weeks: weeksOf(["hypertrophy", "hypertrophy", "hypertrophy", "deload"]),
  },
];
