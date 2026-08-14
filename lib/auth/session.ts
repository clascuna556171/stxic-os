/**
 * Stxic server-side session (httpOnly cookie via Firebase Admin).
 *
 * The client signs in with the Firebase JS SDK, then calls the
 * `establishSession` server action with its ID token. The Admin SDK mints a
 * session cookie stored in an httpOnly cookie. `proxy.ts` and route handlers
 * call `getSessionUserId()` to authorize requests. See docs/AGENT_AUTH_DB.md.
 */

import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "stxic_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/** Mint a Firebase session-cookie string from a fresh ID token. */
export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
}

/** Verify the session cookie and return the uid, or null when unsigned. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
}
