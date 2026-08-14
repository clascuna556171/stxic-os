/**
 * Stxic Firebase Admin bootstrap (server-only).
 *
 * Used by server actions + route handlers + proxy.ts to verify session
 * tokens. Credentials resolution:
 *   1. `FIREBASE_SERVICE_ACCOUNT_PATH` → load that JSON as a service account.
 *   2. `GOOGLE_APPLICATION_CREDENTIALS` → application-default credentials.
 *   3. Otherwise → no credential (Firebase emulator mode, zero cost).
 *
 * NEVER import this module from a client component.
 */

import "server-only";

import { readFileSync } from "node:fs";
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

export function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-stxic";

  const options: AppOptions = { projectId };

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    const json = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    options.credential = cert(json);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    options.credential = applicationDefault();
  }

  return initializeApp(options);
}

export function getAdminAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getAdminApp());
  return authInstance;
}

export function getAdminDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getAdminApp());
  return dbInstance;
}
