import { useFeatureFlags } from "../config/features";

const isCoarse =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

// True on touch-primary devices (phones, tablets) or forced via feature flag.
// Used to enable the on-screen numeric keypad and Enter-based field navigation.
export const isTouchDevice =
  isCoarse || useFeatureFlags().useCustomNumpadOnDesktop;
