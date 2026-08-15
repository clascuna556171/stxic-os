/**
 * Stxic auth server actions.
 *
 * Contract (docs/AGENT_API_ORCHESTRATION.md): every action returns an
 * `Envelope`. All crypto stays client-side (`lib/auth/crypto.ts`) — the
 * server persists only salts, hashes and wrapped DEKs; it never sees the
 * master password, the PIN, or the data encryption key.
 */

"use server";

import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE, createSessionCookie } from "@/lib/auth/session";
import type { Envelope, UserProfile, UserSettings } from "@/types";
import { constantTimeEqual, hashSecret } from "@/lib/auth/crypto";

const PROFILE_COLLECTION = "users";

async function ensureProfile(uid: string): Promise<UserProfile> {
  const doc = getAdminDb().doc(`${PROFILE_COLLECTION}/${uid}`);
  const snap = await doc.get();
  if (snap.exists) return snap.data() as UserProfile;
  const profile: UserProfile = {
    uid,
    email: "",
    createdAt: Date.now(),
    encKeySalt: "",
    wrappedDekMaster: "",
    hasPin: false,
    plan: "free",
  };
  await doc.set(profile);
  return profile;
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

/**
 * Establish an httpOnly session cookie from a Firebase ID token.
 * Call after the client signs in with email/password.
 */
export async function establishSession(
  idToken: string,
): Promise<Envelope<{ uid: string; email: string }>> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const session = await createSessionCookie(idToken);
    (await cookies()).set(SESSION_COOKIE, session, cookieOptions());
    const profile = await ensureProfile(decoded.uid);
    if (!profile.email && decoded.email) {
      await getAdminDb().doc(`${PROFILE_COLLECTION}/${decoded.uid}`).update({
        email: decoded.email,
      });
    }
    return { ok: true, data: { uid: decoded.uid, email: decoded.email ?? "" } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Destroy the session cookie (client signs out too). */
export async function endSession(): Promise<Envelope<null>> {
  (await cookies()).delete(SESSION_COOKIE);
  return { ok: true, data: null };
}

/** Require an authenticated user; throws/returns null when unsigned. */
async function requireUid(): Promise<string | null> {
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

/**
 * Persist the master-password wrap of the DEK + salt.
 * The client derives everything locally; this only stores the payload.
 */
export async function saveMasterPassword(input: {
  encKeySalt: string;
  wrappedDekMaster: string;
}): Promise<Envelope<null>> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await getAdminDb()
      .doc(`${PROFILE_COLLECTION}/${uid}`)
      .update({ encKeySalt: input.encKeySalt, wrappedDekMaster: input.wrappedDekMaster });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Set the PIN: persists salt, PBKDF2 hash, and the PIN-wrapped DEK.
 * The PIN itself is never transmitted — the client computes the hash.
 */
export async function setPin(input: {
  pinSalt: string;
  pinHash: string;
  wrappedDekPin: string;
}): Promise<Envelope<null>> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const ref = getAdminDb().doc(`${PROFILE_COLLECTION}/${uid}/settings/main`);
    await ref.set(
      {
        pinSalt: input.pinSalt,
        pinHash: input.pinHash,
        wrappedDekPin: input.wrappedDekPin,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    await getAdminDb().doc(`${PROFILE_COLLECTION}/${uid}`).update({ hasPin: true });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Verify a PIN. Client sends the raw PIN; server compares a PBKDF2 hash
 * against the stored one (constant-time). On success returns the data the
 * client needs to unwrap the DEK locally.
 */
export async function verifyPin(
  pin: string,
): Promise<Envelope<{ pinSalt: string; wrappedDekPin: string }>> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const snap = await getAdminDb().doc(`${PROFILE_COLLECTION}/${uid}/settings/main`).get();
    if (!snap.exists) return { ok: false, error: "No PIN configured" };
    const settings = snap.data() as UserSettings;
    if (!settings.pinSalt || !settings.pinHash || !settings.wrappedDekPin) {
      return { ok: false, error: "No PIN configured" };
    }
    const hash = await hashSecret(pin, settings.pinSalt);
    if (!constantTimeEqual(hash, settings.pinHash)) {
      return { ok: false, error: "Incorrect PIN" };
    }
    return {
      ok: true,
      data: { pinSalt: settings.pinSalt, wrappedDekPin: settings.wrappedDekPin },
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Persist the WebAuthn biometric config (credential id, salt, wrapped DEK). */
export async function saveBiometric(
  config: UserProfile["biometric"],
): Promise<Envelope<null>> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await getAdminDb()
      .doc(`${PROFILE_COLLECTION}/${uid}`)
      .update({ biometric: config ?? null });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Remove the biometric config (user opted out or re-enrolling). */
export async function clearBiometric(): Promise<Envelope<null>> {
  const uid = await requireUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await getAdminDb()
      .doc(`${PROFILE_COLLECTION}/${uid}`)
      .update({ biometric: null });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export type { Envelope, UserProfile, UserSettings };
