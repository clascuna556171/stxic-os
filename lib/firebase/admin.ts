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
import { generateKeyPairSync } from "node:crypto";
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type AppOptions,
  type Credential,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let emulatorCred: Credential | undefined;

/**
 * Emulator mode has no real service account. Without any credential the Admin
 * Firestore client falls back to Application Default Credentials and probes the
 * GCE metadata server — a multi-second hang (and `MetadataLookupWarning`) on a
 * non-GCE machine that stalls the login→session flow. A throwaway key keeps the
 * SDK from ever touching the metadata server; the emulator never validates it.
 */
function emulatorCredential(): Credential {
  if (!emulatorCred) {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    emulatorCred = cert({
      projectId: "emulator",
      clientEmail: "emulator@localhost",
      privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    });
  }
  return emulatorCred;
}

function isEmulatorMode(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST);
}

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
  } else if (isEmulatorMode()) {
    options.credential = emulatorCredential();
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
