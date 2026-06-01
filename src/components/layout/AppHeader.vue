<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';

// Theme toggling logic
const isDark = ref(false);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

// Sidebar open/close reactive control
const sidebarOpen = ref(false);

onMounted(() => {
  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  } else {
    isDark.value = false;
    document.documentElement.classList.remove('dark');
  }
});
</script>

<template>
  <header class="w-full flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark sticky top-0 z-40 transition-colors duration-300">
    <!-- Logo on the left -->
    <a href="/" class="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent rounded">
      <img src="/src/assets/Logo_Full.svg" alt="Yafa Logo" class="h-8 w-8 object-contain" />
      <span class="font-bold text-text-h-light dark:text-text-h-dark tracking-widest uppercase text-sm hidden sm:inline-block">Y A F A</span>
    </a>

    <!-- Burger Menu + Sidebar on the right -->
    <DialogRoot v-model:open="sidebarOpen">
      <DialogTrigger as="button" class="p-2 -mr-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer">
        <!-- Burger Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
        <span class="sr-only">Open menu</span>
      </DialogTrigger>

      <DialogPortal>
        <Transition name="overlay-transition">
          <DialogOverlay v-if="sidebarOpen" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        </Transition>
        <Transition name="sidebar-transition">
          <DialogContent
            v-if="sidebarOpen"
            class="fixed right-0 top-0 bottom-0 z-50 w-3/4 max-w-xs bg-bg-light dark:bg-bg-dark text-text-light dark:text-text-dark shadow-2xl p-6 focus:outline-none border-l border-border-light dark:border-border-dark flex flex-col justify-between h-full"
          >
            <div class="flex flex-col gap-6">
              <div class="flex items-center justify-between">
                <DialogTitle class="text-lg font-bold tracking-wider text-accent uppercase">
                  Menu
                </DialogTitle>
                <DialogClose as="button" class="text-text-light dark:text-text-dark p-2 -mr-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer">
                  <!-- Close Icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                  <span class="sr-only">Close menu</span>
                </DialogClose>
              </div>
              
              <DialogDescription class="sr-only">
                Main navigation menu
              </DialogDescription>

              <nav class="flex flex-col gap-4">
                <!-- Placeholders for navigation -->
                <a href="#" class="text-text-h-light dark:text-text-h-dark font-medium text-lg hover:text-accent transition-colors cursor-pointer">Dashboard</a>
                <a href="#" class="text-text-light dark:text-text-dark font-medium text-lg hover:text-accent transition-colors cursor-pointer">Workouts</a>
                <a href="#" class="text-text-light dark:text-text-dark font-medium text-lg hover:text-accent transition-colors cursor-pointer">Routines</a>
                <a href="#" class="text-text-light dark:text-text-dark font-medium text-lg hover:text-accent transition-colors cursor-pointer">Settings</a>
              </nav>
            </div>

            <!-- Bottom Theme Switcher -->
            <div class="pt-6 border-t border-border-light dark:border-border-dark flex items-center justify-between mt-auto">
              <span class="text-sm font-medium text-text-light dark:text-text-dark">Theme</span>
              <button @click="toggleTheme" class="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent flex items-center justify-center cursor-pointer">
                <!-- Sun icon (shows in dark mode) -->
                <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-400">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <!-- Moon icon (shows in light mode) -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <span class="sr-only">Toggle theme</span>
              </button>
            </div>
          </DialogContent>
        </Transition>
      </DialogPortal>
    </DialogRoot>
  </header>
</template>

<style scoped>
/* Sidebar transition (slides and fades in/out) */
.sidebar-transition-enter-active,
.sidebar-transition-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out;
}

.sidebar-transition-enter-from,
.sidebar-transition-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Overlay transition (fades in/out) */
.overlay-transition-enter-active,
.overlay-transition-leave-active {
  transition: opacity 0.25s ease-out;
}

.overlay-transition-enter-from,
.overlay-transition-leave-to {
  opacity: 0;
}
</style>
