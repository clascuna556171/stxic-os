import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** AI chat — streams via SSE once the AI agent ships. */
export async function POST() {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: false, error: "not-implemented" }, { status: 501 });
}
