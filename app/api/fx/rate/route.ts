import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** FX rate from frankfurter.app (1h cache) — wires up with the CORE agent. */
export async function GET(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const base = searchParams.get("base") ?? "USD";
  const quote = searchParams.get("quote") ?? "PHP";
  return NextResponse.json({ ok: false, error: "not-implemented", base, quote }, { status: 501 });
}
