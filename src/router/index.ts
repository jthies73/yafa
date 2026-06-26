import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../components/Dashboard.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: Dashboard,
      meta: {
        title: "YAFA - Dashboard | Workout Companion & Tracker",
        description: "Manage your daily fitness routine, track workouts, and autoregulate with RPE.",
      },
    },
    {
      path: "/plans",
      name: "plans",
      component: () => import("../components/PlansPage.vue"),
      meta: {
        title: "Workout Plans & Progression Models | YAFA",
        description: "Browse, create, and customize workout plans. Autoregulate your progression.",
      },
    },
    {
      path: "/exercises",
      name: "exercises",
      component: () => import("../components/ExercisesPage.vue"),
      meta: {
        title: "Exercise Database & Directory | YAFA",
        description: "Explore the comprehensive exercise library. Add custom lifts and track performance history.",
      },
    },
    {
      path: "/exercises/:id",
      name: "exercise-details",
      component: () => import("../components/ExerciseDetailsPage.vue"),
      props: true,
      meta: {
        title: "Exercise Details & Settings | YAFA",
        description: "Detailed guide, performance history, and settings for this exercise.",
      },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../components/SettingsPage.vue"),
      meta: {
        title: "Settings & Preferences | YAFA",
        description: "Configure app features, UI preferences, and export training data.",
      },
    },
    {
      path: "/plans/:id",
      name: "plan-details",
      component: () => import("../components/PlanDetailsPage.vue"),
      props: true,
      meta: {
        title: "Workout Plan Details | YAFA",
        description: "View and customize workout routines, schedules, and active progressions in this plan.",
      },
    },
    {
      path: "/routines/:id",
      name: "routine-details",
      component: () => import("../components/RoutineDetailsPage.vue"),
      props: true,
      meta: {
        title: "Routine Details & Exercise Configuration | YAFA",
        description: "View exercise lists and configure exercises for this workout routine.",
      },
    },
    {
      path: "/analytics",
      name: "analytics",
      component: () => import("../components/AnalyticsPage.vue"),
      meta: {
        title: "Training Analytics & Progress Charts | YAFA",
        description: "Analyze your training volume, intensity history, and estimated 1RM stats over time.",
      },
    },
    {
      path: "/measurements",
      name: "measurements",
      component: () => import("../components/MeasurementsPage.vue"),
      meta: {
        title: "Body Measurements & Trackers | YAFA",
        description: "Log weight, body fat percentage, and other circumferences to monitor body composition.",
      },
    },
    {
      path: "/history",
      name: "history",
      component: () => import("../components/WorkoutHistoryPage.vue"),
      meta: {
        title: "Workout Log History | YAFA",
        description: "View your historical log of completed workouts, times, and performance stats.",
      },
    },
    {
      path: "/install",
      name: "install",
      component: () => import("../components/InstallPage.vue"),
      meta: {
        title: "Install YAFA (PWA) | Workout Tracker",
        description: "Install Yet Another Fitness App on your iOS or Android device for offline, standalone tracking.",
      },
    },
  ],
});

router.afterEach((to) => {
  const defaultTitle = "Y A F A - Yet Another Fitness App | Workout Companion & Tracker";
  document.title = (to.meta.title as string) || defaultTitle;

  const description = to.meta.description as string;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && description) {
    metaDescription.setAttribute("content", description);
  }
});

export default router;
