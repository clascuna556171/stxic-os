"use client";

/**
 * Stxic Firebase client bootstrap (browser only).
 *
 * Reads config from `NEXT_PUBLIC_FIREBASE_*`. When
 * `NEXT_PUBLIC_FIREBASE_EMULATOR=true` it auto-connects the Auth (9099) and
 * Firestore (8080) emulators so the app runs at zero cost without a real
 * project. See docs/AGENT_AUTH_DB.md.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "true";
const AUTH_EMULATOR_URL = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
const FIRESTORE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

function config() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "demo-stxic.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-stxic",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo-stxic.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "demo-app-id",
  };
}

/** Singleton Firebase app. Initialized lazily on first browser call. */
export function getApp(): FirebaseApp {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  app = initializeApp(config());
  return app;
}

export function getAuthClient(): Auth {
  if (auth) return auth;
  auth = getAuth(getApp());
  if (EMULATOR) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL ?? "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
  }
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getApp());
  if (EMULATOR) {
    const [host = "127.0.0.1", port = "8080"] = (FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(
      ":",
    );
    connectFirestoreEmulator(db, host, Number(port));
  }
  return db;
}

export function isEmulatorMode(): boolean {
  return EMULATOR;
}
