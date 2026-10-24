/**
 * Local demo sandbox support.
 *
 * Provides a client-only fallback when Firebase Anonymous Auth is disabled
 * or unconfigured in the Firebase console. Stores demo items in localStorage
 * so users can explore all features immediately.
 */

const LOCAL_DEMO_KEY = "stxic_local_demo";
const DEMO_COOKIE_NAME = "stxic_session";

export function isLocalDemoActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LOCAL_DEMO_KEY) === "true";
  } catch {
    return false;
  }
}

export function enableLocalDemo(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_DEMO_KEY, "true");
    // Set optimistic cookie so Edge proxy allows /dashboard and other pages
    if (typeof document !== "undefined") {
      document.cookie = `${DEMO_COOKIE_NAME}=local_demo_guest; path=/; max-age=86400; SameSite=Lax`;
    }
  } catch (err) {
    console.warn("Could not set local demo flag:", err);
  }
}

export function disableLocalDemo(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_DEMO_KEY);
    if (typeof document !== "undefined") {
      document.cookie = `${DEMO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch (err) {
    console.warn("Could not clear local demo flag:", err);
  }
}

export function clearLocalDemoStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    const len = window.localStorage.length ?? 0;
    for (let i = 0; i < len; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("stxic_demo_")) {
        keysToRemove.push(key);
      }
    }
    // Also inspect Object.keys in case of custom or polyfilled storage
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("stxic_demo_") && !keysToRemove.includes(key)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // fallback to explicit prefixes if storage iteration is restricted
    const explicitKeys = [
      "stxic_demo_vault",
      "stxic_demo_notes",
      "stxic_demo_tasks",
      "stxic_demo_transactions",
      "stxic_demo_accounts",
      "stxic_demo_savingsGoals",
      "stxic_demo_habits",
      "stxic_demo_focusSessions",
      "stxic_demo_settings",
      "stxic_demo_newsConfig",
      "stxic_demo_blackboard",
      "stxic_demo_fxCache",
    ];
    for (const k of explicitKeys) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        // ignore
      }
    }
  }
}
