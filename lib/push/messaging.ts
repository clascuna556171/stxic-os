"use client";

/**
 * Stxic push — client side (hybrid web + Capacitor native).
 *
 * - Web / PWA: uses `firebase/messaging` (FCM), tokens stored at
 *   `users/{uid}/pushTokens/{token}`.
 * - Android APK (Capacitor): uses the native `@capacitor/push-notifications`
 *   plugin. `register()` fires the `registration` event with the FCM token
 *   (`Token.value`); background notifications are rendered natively by the OS,
 *   foreground ones arrive as `pushNotificationReceived`.
 */

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { getApp, getAuthClient, getDb } from "@/lib/firebase/client";
import { doc, deleteDoc, setDoc } from "firebase/firestore";
import type { Envelope } from "@/types";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

function tokensPath(uid: string, token: string): string {
  return `users/${uid}/pushTokens/${token}`;
}

async function persistToken(token: string): Promise<void> {
  const uid = getAuthClient().currentUser?.uid;
  if (!uid) return;
  await setDoc(doc(getDb(), tokensPath(uid, token)), { token, createdAt: Date.now() });
}

/** Request permission + obtain (or return) the push token for this device. */
export async function requestPushToken(): Promise<Envelope<string>> {
  try {
    if (typeof window === "undefined") return { ok: false, error: "Browser only" };

    if (isNativeApp()) {
      const status = await PushNotifications.requestPermissions();
      if (status.receive !== "granted") return { ok: false, error: "Permission denied" };
      const token = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timed out waiting for the push token")),
          15_000,
        );
        const listenerPromise = PushNotifications.addListener("registration", (t: Token) => {
          clearTimeout(timeout);
          resolve(t.value);
        });
        void PushNotifications.register();
        void listenerPromise.then((l) => l.remove());
      });
      if (!token) return { ok: false, error: "No token returned" };
      await persistToken(token);
      return { ok: true, data: token };
    }

    if (!("Notification" in window)) return { ok: false, error: "Notifications unsupported" };
    if (!VAPID_KEY) return { ok: false, error: "VAPID key not configured" };
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Permission denied" };

    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return { ok: false, error: "No token returned" };
    await persistToken(token);
    return { ok: true, data: token };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Remove the current push token (opt-out). */
export async function removePushToken(): Promise<Envelope<null>> {
  try {
    if (isNativeApp()) {
      await PushNotifications.unregister();
      return { ok: true, data: null };
    }
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

/** True when the platform already holds a permission grant. */
export async function hasPushPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) {
    const status = await PushNotifications.checkPermissions();
    return status.receive === "granted";
  }
  return "Notification" in window && Notification.permission === "granted";
}

/** Listen for notifications arriving while the app is open. */
export async function onForegroundMessage(
  handler: (payload: { title?: string; body?: string; url?: string }) => void,
): Promise<void> {
  if (typeof window === "undefined") return;

  if (isNativeApp()) {
    PushNotifications.addListener("pushNotificationReceived", (n: PushNotificationSchema) => {
      handler({
        title: n.title,
        body: n.body,
        url: (n.data?.["url"] as string | undefined) ?? "",
      });
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      handler({
        title: action.notification.title,
        body: action.notification.body,
        url: (action.notification.data?.["url"] as string | undefined) ?? "",
      });
    });
    return;
  }

  const messaging = getMessaging(getApp());
  onMessage(messaging, (payload) => {
    handler({
      title: (payload.data?.["title"] as string | undefined) ?? "Stxic",
      body: (payload.data?.["body"] as string | undefined) ?? "",
      url: (payload.data?.["url"] as string | undefined) ?? "",
    });
  });
}

export type { Envelope };
