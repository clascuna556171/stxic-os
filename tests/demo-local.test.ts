import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isLocalDemoActive,
  enableLocalDemo,
  disableLocalDemo,
  clearLocalDemoStorage,
} from "@/lib/demo/local";
import { getProfile, getSettings, saveProfile, saveSettings } from "@/lib/hydrate";

describe("local demo sandbox storage", () => {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  beforeEach(() => {
    store.clear();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: mockLocalStorage,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("defaults to inactive when localStorage has no flag", () => {
    expect(isLocalDemoActive()).toBe(false);
  });

  it("enables and disables local demo flag cleanly", () => {
    enableLocalDemo();
    expect(isLocalDemoActive()).toBe(true);
    disableLocalDemo();
    expect(isLocalDemoActive()).toBe(false);
  });

  it("clears demo specific keys and dynamic suffixed fxCache keys on clearLocalDemoStorage", () => {
    mockLocalStorage.setItem("stxic_demo_notes", JSON.stringify([{ id: "1", title: "Test" }]));
    mockLocalStorage.setItem("stxic_demo_vault", JSON.stringify([{ id: "v1" }]));
    mockLocalStorage.setItem(
      "stxic_demo_fxCache_USD_PHP",
      JSON.stringify({ base: "USD", quote: "PHP", rate: 58.5 }),
    );
    mockLocalStorage.setItem("unrelated_key", "keep_me");

    clearLocalDemoStorage();

    expect(mockLocalStorage.getItem("stxic_demo_notes")).toBeNull();
    expect(mockLocalStorage.getItem("stxic_demo_vault")).toBeNull();
    expect(mockLocalStorage.getItem("stxic_demo_fxCache_USD_PHP")).toBeNull();
    expect(mockLocalStorage.getItem("unrelated_key")).toBe("keep_me");
  });

  it("persists and retrieves profile displayName and defaultCurrency in local demo mode", async () => {
    enableLocalDemo();

    const initialProfile = await getProfile();
    expect(initialProfile.ok).toBe(true);
    if (initialProfile.ok) {
      expect(initialProfile.data.displayName).toBe("Demo Guest");
    }

    const saveRes = await saveProfile({ displayName: "Orbit Pilot" });
    expect(saveRes.ok).toBe(true);

    const updatedProfile = await getProfile();
    expect(updatedProfile.ok).toBe(true);
    if (updatedProfile.ok) {
      expect(updatedProfile.data.displayName).toBe("Orbit Pilot");
    }

    const currencyRes = await saveSettings({ defaultCurrency: "USD", autoLockMin: 15 });
    expect(currencyRes.ok).toBe(true);

    const settingsRes = await getSettings();
    expect(settingsRes.ok).toBe(true);
    if (settingsRes.ok) {
      expect(settingsRes.data.defaultCurrency).toBe("USD");
      expect(settingsRes.data.autoLockMin).toBe(15);
    }
  });
});
