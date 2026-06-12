import { useI18n } from "vue-i18n";

// ----------------------------------------------
// Display names for system-defined values (data-boundary rule: system
// constants and seeded entries translate via keys; user-entered names always
// render raw to preserve user intent).
// ----------------------------------------------

const muscleKey = (group: string): string =>
  group.toLowerCase().replace(/[^a-z]+/g, "_");

// English names the seed data shipped with. A seeded exercise is translated
// only while its name is untouched — once the user renames it, the raw name
// wins (it is user data from that point on).
const SEEDED_EXERCISE_NAMES: Record<string, string> = {
  "barbell-back-squat": "Barbell Back Squat",
  "barbell-bench-press": "Barbell Bench Press",
  "conventional-deadlift": "Conventional Deadlift",
  "overhead-press": "Overhead Press",
  "pull-ups": "Pull-ups",
  "push-ups": "Push-ups",
  "dumbbell-lateral-raise": "Dumbbell Lateral Raise",
  "bicep-curl": "Bicep Curl",
};

export function useSystemNames() {
  const { t, te } = useI18n();

  /** Translated muscle group label; unknown groups render raw. */
  const muscleLabel = (group: string): string => {
    const key = `muscles.${muscleKey(group)}`;
    return te(key, "en") ? t(key) : group;
  };

  /** Exercise display name: seeded-and-unrenamed → translated, else raw. */
  const exerciseName = (exercise: { id: string; name: string }): string =>
    SEEDED_EXERCISE_NAMES[exercise.id] === exercise.name
      ? t(`exercises.${exercise.id}`)
      : exercise.name;

  /** Measurement type display name: system types translate, custom render raw. */
  const measurementTypeName = (type: {
    id: string;
    name: string;
    isSystem?: boolean;
  }): string =>
    type.isSystem && te(`measurementTypes.${type.id}`, "en")
      ? t(`measurementTypes.${type.id}`)
      : type.name;

  /** Mesocycle focus label (hypertrophy / strength / peaking / deload). */
  const focusLabel = (focus: string): string => t(`focus.${focus}`);
  const focusShortLabel = (focus: string): string => t(`focus.${focus}_short`);

  return { muscleLabel, exerciseName, measurementTypeName, focusLabel, focusShortLabel };
}
