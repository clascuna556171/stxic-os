import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { fetchNews } from "@/lib/news/fetchers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Aggregate RSS feed — `?on=id1,id2` selects sources; default = all enabled. */
export async function GET(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const on = searchParams.get("on");
  const sourceIds = on
    ? on
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const { items, fetchedAt, stale } = await fetchNews(sourceIds);
  return NextResponse.json({ ok: true, data: items, fetchedAt, stale });
}
