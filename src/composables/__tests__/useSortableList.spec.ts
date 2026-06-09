import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, defineComponent, h, nextTick } from "vue";
import { useSortableList, type SortableListOptions } from "../useSortableList";

// ──────────────────────────────────────────────────────────────────────────
// Test scaffolding
//
// jsdom doesn't do layout, so geometry (getBoundingClientRect, scrollTop,
// scrollHeight) is mocked. `requestAnimationFrame` is replaced with a manual
// queue so the auto-scroll loop can be stepped deterministically.
// ──────────────────────────────────────────────────────────────────────────

let rafQueue: FrameRequestCallback[] = [];
const realRaf = globalThis.requestAnimationFrame;
const realCaf = globalThis.cancelAnimationFrame;

function installRaf() {
  rafQueue = [];
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    rafQueue.push(cb)) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
}

/** Run up to `n` animation-frame generations (the loop reschedules itself). */
function flushFrames(n: number) {
  for (let i = 0; i < n; i++) {
    const cbs = rafQueue;
    rafQueue = [];
    if (!cbs.length) break;
    for (const cb of cbs) cb(0);
  }
}

function evt(type: string, props: Record<string, unknown> = {}) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(e, {
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    clientX: 0,
    clientY: 0,
    ...props,
  });
}

function rect(top: number, height: number) {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON() {},
  } as DOMRect;
}

interface SetupOpts {
  rows?: number;
  tops?: number[];
  heights?: number[];
  scroll?: boolean;
  options?: Partial<SortableListOptions> &
    Pick<SortableListOptions, "onReorder">;
}

async function setupList(opts: SetupOpts) {
  const rows = opts.rows ?? 4;
  const tops = opts.tops ?? Array.from({ length: rows }, (_, i) => i * 100);
  const heights = opts.heights ?? Array.from({ length: rows }, () => 100);

  const container = document.createElement("div");
  const handles: HTMLElement[] = [];
  const rowEls: HTMLElement[] = [];
  for (let i = 0; i < rows; i++) {
    const row = document.createElement("div");
    const handle = document.createElement("span");
    handle.className = "drag-handle";
    row.appendChild(handle);
    row.getBoundingClientRect = () => rect(tops[i], heights[i]);
    container.appendChild(row);
    rowEls.push(row);
    handles.push(handle);
  }

  let scrollTopVal = 0;
  let scrollParent: HTMLElement | undefined;
  if (opts.scroll) {
    scrollParent = document.createElement("div");
    scrollParent.style.overflowY = "auto";
    Object.defineProperty(scrollParent, "clientHeight", {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(scrollParent, "scrollHeight", {
      value: 2000,
      configurable: true,
    });
    Object.defineProperty(scrollParent, "scrollTop", {
      get: () => scrollTopVal,
      set: (v) => (scrollTopVal = v),
      configurable: true,
    });
    scrollParent.getBoundingClientRect = () => rect(0, 500);
    scrollParent.appendChild(container);
    document.body.appendChild(scrollParent);
  } else {
    document.body.appendChild(container);
  }

  const elRef = ref<HTMLElement | null>(container);
  const wrapper = mount(
    defineComponent({
      setup() {
        useSortableList(elRef, opts.options as SortableListOptions);
        return {};
      },
      render: () => h("div"),
    }),
  );
  await nextTick();

  return {
    container,
    rowEls,
    handles,
    tops,
    heights,
    get scrollTop() {
      return scrollTopVal;
    },
    wrapper,
  };
}

const press = (h: HTMLElement, x: number, y: number) =>
  h.dispatchEvent(evt("pointerdown", { clientX: x, clientY: y }));
const move = (x: number, y: number) =>
  window.dispatchEvent(evt("pointermove", { clientX: x, clientY: y }));
const release = () => window.dispatchEvent(evt("pointerup"));

beforeEach(() => {
  installRaf();
});

afterEach(() => {
  globalThis.requestAnimationFrame = realRaf;
  globalThis.cancelAnimationFrame = realCaf;
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
});

describe("useSortableList — smoke", () => {
  it("initialises without throwing", () => {
    expect(() => setupList({ options: { onReorder: vi.fn() } })).not.toThrow();
  });

  it("does not fire onReorder on mount", async () => {
    const onReorder = vi.fn();
    await setupList({ options: { onReorder } });
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("useSortableList — reorder", () => {
  it("reports (from, to) after dragging past another row's centre", async () => {
    const onReorder = vi.fn();
    const s = await setupList({
      rows: 4,
      options: { handle: ".drag-handle", onReorder },
    });

    press(s.handles[0], 50, 50);
    move(50, 60); // cross the 8px threshold → begin drag
    move(50, 300); // dy=250 → dragged centre 300, past rows 1 & 2
    release();

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("does not reorder on a tap (no movement past threshold)", async () => {
    const onReorder = vi.fn();
    const s = await setupList({
      rows: 4,
      options: { handle: ".drag-handle", onReorder },
    });

    press(s.handles[1], 50, 150);
    move(50, 152); // within threshold
    release();

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("lifts the grabbed row (z-index + dragging class) during a drag", async () => {
    const s = await setupList({
      rows: 3,
      options: {
        handle: ".drag-handle",
        onReorder: vi.fn(),
        draggingClass: "shadow-lg",
      },
    });

    press(s.handles[0], 50, 50);
    move(50, 70);

    expect(s.rowEls[0].style.zIndex).toBe("20");
    expect(s.rowEls[0].classList.contains("shadow-lg")).toBe(true);

    release();
    expect(s.rowEls[0].style.zIndex).toBe("");
    expect(s.rowEls[0].classList.contains("shadow-lg")).toBe(false);
  });
});

describe("useSortableList — collapse-before-lift", () => {
  it("toggles onCollapse true on press and false on release", async () => {
    const onCollapse = vi.fn();
    const s = await setupList({
      rows: 3,
      options: { handle: ".drag-handle", onReorder: vi.fn(), onCollapse },
    });

    press(s.handles[0], 50, 50);
    expect(onCollapse).toHaveBeenLastCalledWith(true);

    release();
    expect(onCollapse).toHaveBeenLastCalledWith(false);
  });

  it("defers the lift until the collapse animation has settled", async () => {
    vi.useFakeTimers();
    installRaf();

    const s = await setupList({
      rows: 3,
      options: {
        handle: ".drag-handle",
        onReorder: vi.fn(),
        onCollapse: vi.fn(),
        collapseMs: 150,
      },
    });

    press(s.handles[0], 50, 50);
    move(50, 70); // past threshold, but collapse not settled yet
    expect(s.rowEls[0].style.zIndex).toBe(""); // not lifted

    vi.advanceTimersByTime(150);
    expect(s.rowEls[0].style.zIndex).toBe("20"); // lifted after settle
  });

  it("re-anchors a folded row under the cursor (adds the fold drift)", async () => {
    vi.useFakeTimers();
    installRaf();

    // Full geometry: rows at 0/100/200, height 100.
    const tops = [0, 100, 200];
    const heights = [100, 100, 100];
    // On collapse, every row folds to 40px tall and the stack tightens,
    // pulling row 2 up from top 200 → 80 (a 120px upward drift).
    const onCollapse = vi.fn((collapsed: boolean) => {
      if (collapsed) {
        tops.splice(0, 3, 0, 40, 80);
        heights.splice(0, 3, 40, 40, 40);
      }
    });

    const s = await setupList({
      rows: 3,
      tops,
      heights,
      options: {
        handle: ".drag-handle",
        onReorder: vi.fn(),
        onCollapse,
        collapseMs: 150,
      },
    });

    press(s.handles[2], 50, 250); // grab row 2 (pressElemTop = 200)
    move(50, 260); // dy = 10; collapse still settling
    vi.advanceTimersByTime(150); // lift now measures the folded geometry

    // eff = dy(10) + scrollDelta(0) + drift(200 - 80 = 120) = 130
    expect(s.rowEls[2].style.transform).toBe("translateY(130px)");
  });
});

describe("useSortableList — auto-scroll", () => {
  it("scrolls an overflow container via scrollTop when dragging near its edge", async () => {
    const scrollBySpy = vi.fn();
    window.scrollBy = scrollBySpy as typeof window.scrollBy;

    const s = await setupList({
      rows: 8,
      scroll: true,
      options: { handle: ".drag-handle", onReorder: vi.fn() },
    });

    press(s.handles[0], 50, 50);
    move(50, 70); // begin drag
    move(50, 480); // into the bottom edge zone (container bottom 500, edge 56)
    flushFrames(5);

    expect(s.scrollTop).toBeGreaterThan(0);
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it("scrolls the document body via scrollTop (not window.scrollBy) when body is the scroller", async () => {
    // Mirror the real app: <html> is overflow:hidden, <body> scrolls.
    const scrollBySpy = vi.fn();
    window.scrollBy = scrollBySpy as typeof window.scrollBy;

    let bodyScroll = 0;
    document.body.style.overflowY = "auto";
    Object.defineProperty(document.body, "scrollHeight", {
      value: 3000,
      configurable: true,
    });
    Object.defineProperty(document.body, "scrollTop", {
      get: () => bodyScroll,
      set: (v) => (bodyScroll = v),
      configurable: true,
    });

    const s = await setupList({
      rows: 8,
      options: { handle: ".drag-handle", onReorder: vi.fn() },
    });

    press(s.handles[0], 50, 50);
    move(50, 70); // begin drag
    move(50, 740); // edge zone for the viewport (innerHeight 768, edge 56)
    flushFrames(5);

    expect(bodyScroll).toBeGreaterThan(0);
    expect(scrollBySpy).not.toHaveBeenCalled();
  });

  it("does not auto-scroll when the pointer is away from any edge", async () => {
    const s = await setupList({
      rows: 8,
      scroll: true,
      options: { handle: ".drag-handle", onReorder: vi.fn() },
    });

    press(s.handles[0], 50, 50);
    move(50, 70);
    move(50, 250); // comfortably inside the container (bounds 0–500)
    flushFrames(5);

    expect(s.scrollTop).toBe(0);
  });
});
