import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { parseIcal } from "@/lib/blackboard/ical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FEED_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/**
 * BADS-DE iCal sync — fetches + parses the feed server-side (bypasses CORS).
 * Returns parsed events only; task/note mirroring happens client-side because
 * those collections are encrypted with the session DEK.
 */
export async function POST(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const icalUrl = (body as { icalUrl?: unknown })?.icalUrl;
  if (typeof icalUrl !== "string" || !icalUrl.trim()) {
    return NextResponse.json({ ok: false, error: "iCal URL required" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(icalUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return NextResponse.json({ ok: false, error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "stxic/1.0" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Feed returned ${res.status}` },
        { status: 502 },
      );
    }
    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) {
      return NextResponse.json({ ok: false, error: "Feed too large" }, { status: 413 });
    }
    return NextResponse.json({ ok: true, events: parseIcal(text) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 502 });
  }
}
