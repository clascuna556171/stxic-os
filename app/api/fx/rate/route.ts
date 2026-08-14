import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSessionUserId } from "@/lib/auth/session";
import type { Currency, FxCache } from "@/types";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const CURRENCIES: Currency[] = ["PHP", "USD", "EUR", "JPY"];
const FRANKFURTER = "https://api.frankfurter.app/latest";

async function fetchRate(base: string, quote: string): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${FRANKFURTER}?from=${base}&to=${quote}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.[quote];
    if (typeof rate !== "number") throw new Error("missing rate");
    return rate;
  } finally {
    clearTimeout(timeout);
  }
}

/** FX rate from frankfurter.app (ECB), cached 1h per user in Firestore. */
export async function GET(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const base = (searchParams.get("base") ?? "USD").toUpperCase();
  const quote = (searchParams.get("quote") ?? "PHP").toUpperCase();
  if (!CURRENCIES.includes(base as Currency) || !CURRENCIES.includes(quote as Currency)) {
    return NextResponse.json({ ok: false, error: "Unsupported currency" }, { status: 400 });
  }

  const ref = getAdminDb().doc(`users/${uid}/fxCache/${base}_${quote}`);
  const snap = await ref.get();
  const cached = snap.data() as FxCache | undefined;
  const fresh = cached != null && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  if (fresh) {
    return NextResponse.json({ ok: true, data: cached, stale: false });
  }

  try {
    const rate = await fetchRate(base, quote);
    const data: FxCache = {
      base: base as Currency,
      quote: quote as Currency,
      rate,
      fetchedAt: Date.now(),
    };
    await ref.set(data);
    return NextResponse.json({ ok: true, data, stale: false });
  } catch {
    if (cached) {
      return NextResponse.json({ ok: true, data: cached, stale: true });
    }
    return NextResponse.json({ ok: false, error: "FX rate unavailable" }, { status: 502 });
  }
}
