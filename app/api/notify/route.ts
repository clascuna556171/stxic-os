import { NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging } from "@/lib/firebase/admin";
import { getSessionUserId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Send a push notification to the signed-in user's registered devices.
 * Reads FCM tokens from `users/{uid}/pushTokens` and fans out one multicast
 * message. Used by in-app triggers (task due, focus end, digest ready).
 */
export async function POST(request: Request) {
  const uid = await getSessionUserId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: unknown; body?: unknown; url?: unknown };
  try {
    body = (await request.json()) as { title?: unknown; body?: unknown; url?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.slice(0, 80) : "";
  const messageBody = typeof body.body === "string" ? body.body.slice(0, 200) : "";
  const url = typeof body.url === "string" && body.url.startsWith("/") ? body.url : "/dashboard";
  if (!title && !messageBody) {
    return NextResponse.json({ ok: false, error: "title or body required" }, { status: 400 });
  }

  try {
    const tokensSnap = await getAdminDb().collection(`users/${uid}/pushTokens`).limit(50).get();
    const tokens = tokensSnap.docs.map((d) => d.data().token as string).filter(Boolean);
    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, data: { sent: 0 } });
    }
    const result = await getAdminMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body: messageBody },
      data: { title, body: messageBody, url },
    });
    return NextResponse.json({
      ok: true,
      data: { sent: result.successCount, failed: result.failureCount },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
