/**
 * Stxic push trigger helper (client-side).
 *
 * Thin wrapper over `/api/notify` for in-app moments (focus complete, task
 * due, digest ready). The API route auths via the session cookie, so no token
 * is sent here. No-ops when notifications are unsupported.
 */

export async function sendAppNotification(input: {
  title: string;
  body?: string;
  url?: string;
}): Promise<void> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // Push is best-effort — never fail the parent action.
  }
}
