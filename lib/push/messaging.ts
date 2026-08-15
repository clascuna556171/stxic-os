"use client";

/**
 * Stxic FCM web push — client side.
 *
 * Wraps `firebase/messaging` for token registration + foreground notifications
 * and persists the FCM token in Firestore at `users/{uid}/pushTokens`.
 * Background handling lives in the `firebase-messaging-sw.js` service worker.
 */

import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { getApp, getAuthClient } from "@/lib/firebase/client";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Envelope } from "@/types";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

function tokensPath(uid: string, token: string): string {
  return `users/${uid}/pushTokens/${token}`;
}

/** Request Notification permission + obtain (or return) the FCM token. */
export async function requestPushToken(): Promise<Envelope<string>> {
  try {
    if (typeof window === "undefined") return { ok: false, error: "Browser only" };
    if (!("Notification" in window)) return { ok: false, error: "Notifications unsupported" };
    if (!VAPID_KEY) return { ok: false, error: "VAPID key not configured" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Permission denied" };

    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return { ok: false, error: "No token returned" };

    const uid = getAuthClient().currentUser?.uid;
    if (uid) {
      await setDoc(doc(getDb(), tokensPath(uid, token)), { token, createdAt: Date.now() });
    }
    return { ok: true, data: token };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Remove the current FCM token for the user (opt-out). */
export async function removePushToken(): Promise<Envelope<null>> {
  try {
    const uid = getAuthClient().currentUser?.uid;
    const messaging = getMessaging(getApp());
    const current = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (current && uid) {
      await deleteDoc(doc(getDb(), tokensPath(uid, current)));
    }
    await deleteToken(messaging);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** True when the browser already holds a permission grant. */
export async function hasPushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "granted";
}

/** Register a callback for notifications arriving while the app is open. */
export async function onForegroundMessage(handler: (payload: { title?: string; body?: string }) => void) {
  if (typeof window === "undefined") return;
  const messaging = getMessaging(getApp());
  onMessage(messaging, (payload) => {
    handler({
      title: (payload.data?.["title"] as string | undefined) ?? "Stxic",
      body: (payload.data?.["body"] as string | undefined) ?? "",
    });
  });
}

/** Whether the current user has any stored push tokens. */
export async function hasStoredPushToken(): Promise<boolean> {
  const uid = getAuthClient().currentUser?.uid;
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}/pushTokens/_meta`));
    return snap.exists();
  } catch {
    return false;
  }
}

export type { Envelope };
