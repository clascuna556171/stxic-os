import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Saved-for-later news items — wires up with the NEWS agent. */
export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: false, error: "not-implemented" }, { status: 501 });
}
