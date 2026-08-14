import { describe, it, expect } from "vitest";
import { FX_CACHE_TTL_MS, FX_CURRENCIES, isStale } from "@/lib/fx";
import type { FxCache } from "@/types";

describe("FX cache staleness", () => {
  it("flags caches older than the TTL", () => {
    const now = 1_000_000_000;
    const fresh: FxCache = { base: "USD", quote: "PHP", rate: 56.1, fetchedAt: now - 1000 };
    const stale: FxCache = {
      base: "USD",
      quote: "PHP",
      rate: 56.1,
      fetchedAt: now - FX_CACHE_TTL_MS - 1,
    };
    expect(isStale(fresh, now)).toBe(false);
    expect(isStale(stale, now)).toBe(true);
  });

  it("supports exactly the four core currencies", () => {
    expect(FX_CURRENCIES).toEqual(["PHP", "USD", "EUR", "JPY"]);
  });
});
