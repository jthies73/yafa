import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { seedDatabase } from "./db/seed";
import router from "./router";
import { initializeFeatures, useFeatureFlags } from "./config/features";
import { vNumpad } from "./directives/numpad";
import { vKeynav } from "./directives/keynav";
import { initializeSettings } from "./config/settings";
import { restoreActiveWorkout } from "./composables/useActiveWorkout";

document.addEventListener("focusin", (e) => {
  const target = e.target as HTMLElement;
  if (
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement) &&
    !target.hasAttribute("data-no-select")
  ) {
    target.select();
  }
});

async function bootstrap() {
  initializeSettings(localStorage);
  initializeFeatures();
  try {
    const features = useFeatureFlags();
    if (features.seedDatabase) {
      await seedDatabase();
    }

    // Dev-only: populate sample workouts/measurements/charts so analytics (and
    // its CSV export) can be exercised. Dynamically imported behind the DEV
    // guard so it tree-shakes out of production builds.
    if (import.meta.env.DEV) {
      const { seedDevSampleData } = await import("./db/devSeed");
      await seedDevSampleData();
    }

    // Rehydrate an in-progress workout from localStorage before the app mounts,
    // so the running sheet reappears and the tracker resumes where it left off.
    restoreActiveWorkout();
  } catch (err) {
    console.error("YAFA: Bootstrap failed", err);
  }

  createApp(App)
    .use(router)
    .directive("numpad", vNumpad)
    .directive("keynav", vKeynav)
    .mount("#app");
}

bootstrap();
