import { describe, it, expect } from "vitest";
import { applyPortableSettings, readPortableSettings, initializeSettings } from "../settings";

const fakeStore = (seed: Record<string, string> = {}) => {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
};

describe("readPortableSettings", () => {
  it("emits only allowlisted keys that are present", () => {
    const store = fakeStore({
      "yafa:theme": "dark",
      "yafa:weightUnit": "lbs",
      // device/session keys must NOT travel:
      "yafa:activePage": "/analytics",
      "yafa:dismissedInstallBanner": "true",
    });
    expect(readPortableSettings(store)).toEqual({
      "yafa:theme": "dark",
      "yafa:weightUnit": "lbs",
    });
  });

  it("omits missing keys (no nulls)", () => {
    expect(readPortableSettings(fakeStore())).toEqual({});
  });
});

describe("applyPortableSettings", () => {
  it("writes only allowlisted keys and ignores unknown ones", () => {
    const store = fakeStore();
    applyPortableSettings(
      {
        "yafa:theme": "light",
        "yafa:lengthUnit": "in",
        "yafa:activePage": "/settings", // not allowlisted → ignored
        bogus: "x", // unknown → ignored
      },
      store,
    );
    expect(store.map.get("yafa:theme")).toBe("light");
    expect(store.map.get("yafa:lengthUnit")).toBe("in");
    expect(store.map.has("yafa:activePage")).toBe(false);
    expect(store.map.has("bogus")).toBe(false);
  });

  it("is a no-op when settings is undefined", () => {
    const store = fakeStore();
    applyPortableSettings(undefined, store);
    expect(store.map.size).toBe(0);
  });
});

describe("initializeSettings", () => {
  it("populates all default values when store is empty", () => {
    const store = fakeStore();
    initializeSettings(store);
    expect(store.map.get("yafa:theme")).toBe("light");
    expect(store.map.get("yafa:weightUnit")).toBe("kg");
    expect(store.map.get("yafa:lengthUnit")).toBe("cm");
    expect(store.map.get("yafa:analyticsTimeframe")).toBe("max");
    expect(store.map.get("yafa:exerciseChartTimeframe")).toBe("max");
  });

  it("preserves existing values and only initializes missing ones", () => {
    const store = fakeStore({
      "yafa:theme": "dark",
      "yafa:weightUnit": "lbs",
    });
    initializeSettings(store);
    expect(store.map.get("yafa:theme")).toBe("dark");
    expect(store.map.get("yafa:weightUnit")).toBe("lbs");
    expect(store.map.get("yafa:lengthUnit")).toBe("cm");
    expect(store.map.get("yafa:analyticsTimeframe")).toBe("max");
    expect(store.map.get("yafa:exerciseChartTimeframe")).toBe("max");
  });
});
