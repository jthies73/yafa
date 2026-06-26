<template>
  <div class="flex flex-col items-center justify-center min-h-screen gap-6 p-6">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-accent mb-2">404</h1>
      <p class="text-xl text-gray-400">This page doesn't exist.</p>
    </div>
    <RouterLink
      to="/"
      class="px-6 py-3 bg-accent text-bg-dark rounded-lg font-semibold hover:opacity-90 cursor-pointer transition-opacity"
    >
      Return to Home
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
