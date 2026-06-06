<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useNumericKeypad } from "../composables/useNumericKeypad";

const {
  visible,
  dotEnabled,
  pressDigit,
  pressDot,
  pressBackspace,
  pressEnter,
  dismiss,
} = useNumericKeypad();

interface Key {
  label: string;
  area: string;
  digit?: string;
  act?: "dot" | "back" | "enter";
}

// 4-column grid: digits 1-9 fill columns 1-3, a tall Enter spans the right
// column under the backspace key, "0" spans the bottom-left two cells.
const KEYS: Key[] = [
  { label: "1", digit: "1", area: "1 / 1 / 2 / 2" },
  { label: "2", digit: "2", area: "1 / 2 / 2 / 3" },
  { label: "3", digit: "3", area: "1 / 3 / 2 / 4" },
  { label: "back", act: "back", area: "1 / 4 / 2 / 5" },
  { label: "4", digit: "4", area: "2 / 1 / 3 / 2" },
  { label: "5", digit: "5", area: "2 / 2 / 3 / 3" },
  { label: "6", digit: "6", area: "2 / 3 / 3 / 4" },
  { label: "enter", act: "enter", area: "2 / 4 / 5 / 5" },
  { label: "7", digit: "7", area: "3 / 1 / 4 / 2" },
  { label: "8", digit: "8", area: "3 / 2 / 4 / 3" },
  { label: "9", digit: "9", area: "3 / 3 / 4 / 4" },
  { label: "0", digit: "0", area: "4 / 1 / 5 / 3" },
  { label: ".", act: "dot", area: "4 / 3 / 5 / 4" },
];

const onKey = (k: Key) => {
  if (k.digit) pressDigit(k.digit);
  else if (k.act === "dot") pressDot();
  else if (k.act === "back") pressBackspace();
  else if (k.act === "enter") pressEnter();
};

// ── Drag-to-dismiss (mirrors AppSidebar's absolute/relative gesture modes) ─────

const INTENT_THRESHOLD = 6;
const VELOCITY_THRESHOLD = 0.4;

const keypadEl = ref<HTMLElement | null>(null);
const keypadHeight = ref(240);
const isDragging = ref(false);
const dragOffset = ref(0); // px translated down from the open position

let pointerId: number | null = null;
let startY = 0;
let startX = 0;
let lastY = 0;
let lastT = 0;
let velocity = 0;
let intent: "none" | "horizontal" | "vertical" = "none";
let dragMode: "absolute" | "relative" = "relative";
let suppressNextClick = false;

const measureHeight = () =>
  keypadEl.value?.offsetHeight || keypadHeight.value || 240;

const beginDrag = (
  e: PointerEvent,
  mode: "absolute" | "relative" = "relative",
) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  pointerId = e.pointerId;
  startX = e.clientX;
  startY = lastY = e.clientY;
  lastT = e.timeStamp;
  velocity = 0;
  intent = "none";
  dragMode = mode;
  keypadHeight.value = measureHeight();
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
};

const onMove = (e: PointerEvent) => {
  if (e.pointerId !== pointerId) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (intent === "none") {
    if (Math.abs(dx) < INTENT_THRESHOLD && Math.abs(dy) < INTENT_THRESHOLD)
      return;
    intent = Math.abs(dy) > Math.abs(dx) ? "vertical" : "horizontal";
    if (intent === "horizontal") {
      teardown();
      return;
    }
    isDragging.value = true;
  }

  e.preventDefault();
  const h = keypadHeight.value;
  if (dragMode === "absolute") {
    // Snap the panel's top edge to the finger once it enters the keypad area.
    dragOffset.value = Math.max(
      0,
      Math.min(h, e.clientY - (window.innerHeight - h)),
    );
  } else {
    // Move relative to where the drag started — downward only, no jump.
    dragOffset.value = Math.max(0, Math.min(h, dy));
  }

  const dt = e.timeStamp - lastT;
  if (dt > 0) velocity = (e.clientY - lastY) / dt;
  lastY = e.clientY;
  lastT = e.timeStamp;
};

const endDrag = () => {
  if (intent === "vertical" && isDragging.value) {
    const h = keypadHeight.value;
    const shouldDismiss =
      velocity > VELOCITY_THRESHOLD ||
      (velocity >= -VELOCITY_THRESHOLD && dragOffset.value > h / 2);
    suppressNextClick = true;
    if (shouldDismiss) {
      // Hold the mid-drag position (isDragging stays true) while dismiss()
      // queues the visibility change via rAF. watch(visible) below releases
      // the drag once visible flips, so the CSS transition slides out from
      // the current position instead of snapping to 0 first.
      removeListeners();
      pointerId = null;
      intent = "none";
      dismiss();
      return;
    }
  }
  teardown();
};

watch(visible, (v) => {
  if (!v && isDragging.value) teardown();
});

const onHandleClick = () => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  dismiss();
};

const removeListeners = () => {
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", endDrag);
  window.removeEventListener("pointercancel", endDrag);
};

const teardown = () => {
  removeListeners();
  isDragging.value = false;
  dragOffset.value = 0;
  intent = "none";
  pointerId = null;
};

const panelStyle = computed(() => {
  if (isDragging.value) {
    return {
      transform: `translateY(${dragOffset.value}px)`,
      transition: "none",
    };
  }
  return {
    transform: visible.value ? "translateY(0)" : "translateY(100%)",
    transition: "transform 0.2s ease",
  };
});

const measure = () => {
  keypadHeight.value = measureHeight();
};

onMounted(() => {
  nextTick(measure);
  window.addEventListener("resize", measure);
});

onUnmounted(() => {
  removeListeners();
  window.removeEventListener("resize", measure);
});
</script>

<template>
  <!-- Outside catch zone: a downward drag started just above the keypad makes
       the panel follow the finger (absolute mode). -->
  <div
    v-show="visible && !isDragging"
    class="fixed inset-x-0 z-[69] h-8 touch-none"
    :style="{ bottom: keypadHeight + 'px' }"
    @pointerdown.prevent="beginDrag($event, 'absolute')"
  />

  <div
    ref="keypadEl"
    class="fixed inset-x-0 bottom-0 z-[70] border-t border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark shadow-[0_-8px_24px_rgba(0,0,0,0.12)] select-none touch-none"
    :style="panelStyle"
  >
    <!-- Drag handle: drag from inside must start here; tap to dismiss -->
    <div
      class="flex justify-center py-1.5 cursor-pointer"
      role="button"
      aria-label="Hide keypad"
      @pointerdown.prevent="beginDrag($event, 'relative')"
      @click="onHandleClick"
    >
      <div
        class="flex h-7 w-12 items-center justify-center rounded-md text-text-light dark:text-text-dark opacity-50 transition-opacity duration-150 pointer-events-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>

    <!-- Keys -->
    <div
      class="grid gap-1.5 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      style="
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 3rem);
      "
    >
      <button
        v-for="k in KEYS"
        :key="k.label"
        type="button"
        :style="{ gridArea: k.area }"
        :disabled="k.act === 'dot' && !dotEnabled"
        class="flex items-center justify-center rounded-lg text-xl font-mono font-semibold cursor-pointer transition-colors duration-150 disabled:opacity-30 disabled:cursor-default"
        :class="
          k.act === 'enter'
            ? 'bg-accent text-bg-dark hover:bg-accent/90'
            : 'bg-surface-light dark:bg-surface-dark text-text-h-light dark:text-text-h-dark border border-border-light dark:border-border-dark enabled:hover:bg-surface-light-hover dark:enabled:hover:bg-surface-dark-hover'
        "
        @pointerdown.prevent
        @click="onKey(k)"
      >
        <!-- Backspace icon -->
        <svg
          v-if="k.act === 'back'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
          <line x1="18" x2="12" y1="9" y2="15" />
          <line x1="12" x2="18" y1="9" y2="15" />
        </svg>
        <!-- Enter icon -->
        <svg
          v-else-if="k.act === 'enter'"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 10 4 15 9 20" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </svg>
        <span v-else>{{ k.label }}</span>
      </button>
    </div>
  </div>
</template>
