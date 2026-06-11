import type { MesocycleWeek, Plan } from "../db/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Resolves which mesocycle week a point in time falls into. Anchored to the
 * plan's created_at (plans don't carry an explicit start date yet — when one
 * lands, only this function changes) and wrapping, so a finished mesocycle
 * repeats from week 1 until the user edits the plan.
 */
export function resolveMesocycleWeek(
  plan: Plan | undefined,
  at: number,
): MesocycleWeek | undefined {
  const weeks = plan?.mesocycle;
  if (!plan || !weeks?.length) return undefined;
  const weeksElapsed = Math.max(
    0,
    Math.floor((at - plan.created_at) / WEEK_MS),
  );
  return weeks[weeksElapsed % weeks.length];
}
