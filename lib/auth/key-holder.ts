"use client";

/**
 * In-memory holder for the session Data Encryption Key (DEK).
 *
 * The DEK is derived/unwrapped client-side during unlock and never leaves the
 * tab. It is NOT persisted anywhere — clearing it (auto-lock / lock) means all
 * encrypted collections are temporarily unreadable via hydrate. See
 * docs/AGENT_AUTH_DB.md.
 */

let sessionKey: CryptoKey | null = null;

export function setSessionKey(key: CryptoKey): void {
  sessionKey = key;
}

export function clearSessionKey(): void {
  sessionKey = null;
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function isSessionUnlocked(): boolean {
  return sessionKey !== null;
}
