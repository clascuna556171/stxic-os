/**
 * FX converter client — 1h-cached rates via the `/api/fx/rate` route, with a
 * local Firestore cache read (hydrate) for instant display and a `stale` flag
 * when the last successful fetch is older than the TTL (or offline).
 */

import type { Currency, FxCache } from "@/types";
import { getFxRate as readCachedRate, saveFxRate } from "@/lib/hydrate";

export const FX_CACHE_TTL_MS = 60 * 60 * 1000;
export const FX_CURRENCIES: Currency[] = ["PHP", "USD", "EUR", "JPY"];

export interface FxRateResult {
  rate: number;
  fetchedAt: number;
  stale: boolean;
}

export function isStale(cache: FxCache, now = Date.now()): boolean {
  return now - cache.fetchedAt >= FX_CACHE_TTL_MS;
}

export async function getFxRate(
  base: Currency,
  quote: Currency,
): Promise<{ ok: true; data: FxRateResult } | { ok: false; error: string }> {
  if (base === quote) {
    return { ok: true, data: { rate: 1, fetchedAt: Date.now(), stale: false } };
  }

  const cached = await readCachedRate(base, quote);
  if (cached.ok && !isStale(cached.data)) {
    return {
      ok: true,
      data: { rate: cached.data.rate, fetchedAt: cached.data.fetchedAt, stale: false },
    };
  }

  try {
    const res = await fetch(`/api/fx/rate?base=${base}&quote=${quote}`, { cache: "no-store" });
    const json = (await res.json()) as {
      ok: boolean;
      data?: FxCache;
      stale?: boolean;
      error?: string;
    };
    if (json.ok && json.data) {
      await saveFxRate(json.data);
      return {
        ok: true,
        data: { rate: json.data.rate, fetchedAt: json.data.fetchedAt, stale: json.stale === true },
      };
    }
    if (cached.ok) {
      return {
        ok: true,
        data: { rate: cached.data.rate, fetchedAt: cached.data.fetchedAt, stale: true },
      };
    }
    return { ok: false, error: json.error ?? "FX rate unavailable" };
  } catch {
    if (cached.ok) {
      return {
        ok: true,
        data: { rate: cached.data.rate, fetchedAt: cached.data.fetchedAt, stale: true },
      };
    }
    return { ok: false, error: "FX rate unavailable" };
  }
}
