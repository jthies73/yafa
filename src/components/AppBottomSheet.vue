<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "reka-ui";

defineProps<{
  title?: string;
}>();

const open = defineModel<boolean>("open", { required: true });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <!-- Backdrop -->
      <Transition
        enter-from-class="opacity-0"
        enter-active-class="transition-opacity duration-200 ease-out"
        leave-to-class="opacity-0"
        leave-active-class="transition-opacity duration-150 ease-in"
      >
        <DialogOverlay v-if="open" class="fixed inset-0 bg-black/60 z-50" />
      </Transition>

      <!-- Panel -->
      <Transition
        enter-from-class="translate-y-full"
        enter-active-class="transition-transform duration-300 ease-out"
        leave-to-class="translate-y-full"
        leave-active-class="transition-transform duration-200 ease-in"
      >
        <DialogContent
          v-if="open"
          class="fixed bottom-0 inset-x-0 z-50 bg-bg-light dark:bg-bg-dark rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col focus:outline-none"
        >
          <!-- Handle -->
          <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div
              class="w-10 h-1 bg-border-light dark:bg-border-dark rounded-full"
            ></div>
          </div>

          <!-- Header -->
          <div
            class="flex items-center justify-between px-5 py-4 border-b border-border-light dark:border-border-dark shrink-0"
          >
            <div class="min-w-0">
              <slot name="title">
                <DialogTitle
                  class="text-lg font-bold text-text-h-light dark:text-text-h-dark truncate"
                >
                  {{ title }}
                </DialogTitle>
              </slot>
            </div>

            <DialogClose
              class="p-2 -mr-2 text-text-light dark:text-text-dark hover:text-text-h-light dark:hover:text-text-h-dark cursor-pointer transition-colors duration-150 shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </DialogClose>
          </div>

          <!-- Subheader -->
          <slot name="subheader"></slot>

          <!-- Body -->
          <div class="overflow-y-auto flex-1 flex flex-col relative">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="px-5 py-4 border-t border-border-light dark:border-border-dark flex gap-3 shrink-0"
          >
            <slot name="footer"></slot>
          </div>
        </DialogContent>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>
