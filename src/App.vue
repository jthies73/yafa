<script setup lang="ts">
import { onMounted } from "vue";
import AppHeader from "./components/layout/AppHeader.vue";
import WorkoutBottomSheet from "./components/WorkoutBottomSheet.vue";
import WorkoutSummarySheet from "./components/summary/WorkoutSummarySheet.vue";
import NumericKeypad from "./components/NumericKeypad.vue";
import { useActiveWorkout } from "./composables/useActiveWorkout";
import { detectPlatform, isStandalone } from "./utils/platform";

const { activeWorkout } = useActiveWorkout();

onMounted(() => {
  const isTrackedEnv = ["development", "staging", "production"].includes(
    import.meta.env.MODE,
  );

  if (isTrackedEnv) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (baseUrl) {
      // 1. Record page visit
      fetch(`${baseUrl}/page-visits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: window.location.pathname }),
      }).catch(() => {});

      // 2. Record PWA install if running in standalone mode for the first time
      // (Crucial for iOS Safari which doesn't support the 'appinstalled' event)
      if (isStandalone() && !localStorage.getItem("pwa_install_recorded")) {
        const platform = detectPlatform().os;
        fetch(`${baseUrl}/pwa-installs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ platform }),
        })
          .then((res) => {
            if (res.ok) {
              localStorage.setItem("pwa_install_recorded", "true");
            }
          })
          .catch(() => {});
      }
    }
  }

  // Real-time appinstalled listener (supported by Chrome / Android)
  window.addEventListener("appinstalled", () => {
    if (isTrackedEnv) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      if (baseUrl && !localStorage.getItem("pwa_install_recorded")) {
        const platform = detectPlatform().os;
        fetch(`${baseUrl}/pwa-installs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ platform }),
        })
          .then((res) => {
            if (res.ok) {
              localStorage.setItem("pwa_install_recorded", "true");
            }
          })
          .catch(() => {});
      }
    }
  });
});
</script>

<template>
  <div
    class="flex flex-col min-h-screen w-full bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark transition-colors duration-300 select-none"
  >
    <AppHeader />
    <main
      class="grow flex flex-col w-full relative"
      :class="{ 'pb-24': activeWorkout }"
    >
      <router-view />
    </main>
    <WorkoutBottomSheet />
    <WorkoutSummarySheet />
    <NumericKeypad />
  </div>
</template>
