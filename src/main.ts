import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { seedDatabase } from "./db/seed";

// Seed local database on start if empty
seedDatabase().catch((err) => {
  console.error("YAFA: Seeding failed", err);
});

createApp(App).mount("#app");
