import type { PeriodizationFocus, MesocycleWeek } from "../db/types";

/**
 * Single source of truth for periodization focuses.
 *
 * `intensity` and `volume` (0..1) are *approximate* values used only to draw the
 * mesocycle chart — they sketch the canonical curve (volume tapers while
 * intensity climbs to a peak, then a deload drops both). The per-exercise
 * intensity/volume calculation that a focus will eventually drive is deferred;
 * when it lands it can read these (or per-week overrides) without a model change.
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
