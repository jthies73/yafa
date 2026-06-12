import type {
  AnalyticsBucket,
  AnalyticsChartConfig,
  AnalyticsMetric,
} from "../db/types";
import type { BucketPoint } from "./compute";
import type { Timeframe } from "./service";
import { i18n } from "../i18n";

// ----------------------------------------------
// Analytics presentation layer: chart-type assignment, labels and tooltip
// text. Pure string/enum logic (no Chart.js, no Vue) so it stays testable
// independently of rendering. Labels resolve through i18n.global at call
// time so they always reflect the active locale.
// ----------------------------------------------

const t = i18n.global.t;

export type ChartType = "bar" | "stackedBar" | "line";

/**
 * Chart type per configuration (spec §3): trends (e1RM, measurements) read as
 * lines; quantities read as bars; muscle-scope quantities split into a
 * direct/indirect stack so the stimulus composition stays visible.
 */
export function chartTypeFor(
  config: Pick<AnalyticsChartConfig, "sourceKind" | "metric">,
): ChartType {
  if (config.sourceKind === "measurement" || config.metric === "e1rm")
    return "line";
  return config.sourceKind === "muscle" ? "stackedBar" : "bar";
}

export const metricLabel = (metric: AnalyticsMetric): string =>
  t(`analytics.metric_${metric}`);

export const bucketLabel = (bucket: AnalyticsBucket): string =>
  t(`analytics.bucket_${bucket}`);

export const TIMEFRAME_OPTIONS: { value: Timeframe; labelKey: string }[] = [
  { value: "max", labelKey: "analytics.timeframe_max" },
  { value: "year", labelKey: "analytics.timeframe_year" },
  { value: "month", labelKey: "analytics.timeframe_month" },
  { value: "week", labelKey: "analytics.timeframe_week" },
];

// Lowercase nouns for tooltip sentences ("10 direct sets", "240 kg volume").
const metricNoun = (metric: AnalyticsMetric): string =>
  t(`analytics.noun_${metric}`);

export interface TooltipContext {
  bucket: AnalyticsBucket;
  metric: AnalyticsMetric;
  scopeLabel: string;
  formatValue: (value: number) => string;
}

const bucketPrefix = (bucket: AnalyticsBucket, point: BucketPoint): string =>
  bucket === "week"
    ? t("analytics.tooltip_week_of", { date: point.label })
    : point.label;

/** Headline, e.g. "Week of Mar 4 — Triceps sets: 10 total". */
export function tooltipTitle(point: BucketPoint, ctx: TooltipContext): string {
  const where = bucketPrefix(ctx.bucket, point);
  const value = ctx.formatValue(point.value);
  switch (ctx.metric) {
    case "value":
      return t("analytics.tooltip_value", {
        where,
        scope: ctx.scopeLabel,
        value,
      });
    case "e1rm":
      return t("analytics.tooltip_e1rm", {
        where,
        scope: ctx.scopeLabel,
        value,
      });
    case "workouts":
      return t("analytics.tooltip_workouts", { where, value });
    default:
      return t("analytics.tooltip_metric_total", {
        where,
        scope: ctx.scopeLabel,
        noun: metricNoun(ctx.metric),
        value,
      });
  }
}

// Cap the per-exercise listing so a busy global bucket can't produce a
// screen-filling tooltip; the dropped remainder is summarized.
const MAX_BREAKDOWN_EXERCISES = 6;

/**
 * The full mathematical breakdown under the headline — one line per recruitment
 * role listing every contributing exercise with its multiplier, e.g.
 * "6 indirect sets (Bench Press ×0.5, OHP ×0.5)".
 */
export function tooltipLines(
  point: BucketPoint,
  ctx: TooltipContext,
): string[] {
  if (ctx.metric === "e1rm") {
    if (!point.bestSet) return [];
    const { weight, reps, rpe } = point.bestSet;
    const formatted = ctx.formatValue(weight);
    return [
      rpe !== undefined
        ? t("analytics.tooltip_best_set_rpe", {
            weight: formatted,
            reps,
            rpe,
          })
        : t("analytics.tooltip_best_set", { weight: formatted, reps }),
    ];
  }
  if (ctx.metric === "value") {
    return point.samples && point.samples > 1
      ? [t("analytics.tooltip_average_entries", point.samples)]
      : [];
  }
  if (ctx.metric === "workouts") return [];

  const noun = metricNoun(ctx.metric);
  const lines: string[] = [];
  for (const role of ["direct", "indirect"] as const) {
    const group = point.contributions.filter((c) => c.role === role);
    if (!group.length) continue;
    const total = group.reduce((sum, c) => sum + c.value, 0);
    const shown = group
      .slice(0, MAX_BREAKDOWN_EXERCISES)
      .map((c) => `${c.label} ×${c.multiplier}`)
      .join(", ");
    const more =
      group.length > MAX_BREAKDOWN_EXERCISES
        ? t("analytics.tooltip_more", {
            n: group.length - MAX_BREAKDOWN_EXERCISES,
          })
        : "";
    lines.push(
      t(`analytics.tooltip_breakdown_${role}`, {
        value: ctx.formatValue(total),
        noun,
        breakdown: `${shown}${more}`,
      }),
    );
  }
  return lines;
}
