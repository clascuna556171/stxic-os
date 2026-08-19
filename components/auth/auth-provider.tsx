"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";
import { clearSessionKey, setSessionKey } from "@/lib/auth/key-holder";
import { endSession, establishSession } from "@/lib/auth/actions";
import { exportDek, generateDek, importDek } from "@/lib/auth/crypto";
import { getSettings, saveSettings } from "@/lib/hydrate";
import { resetDemo, seedDemoData } from "@/lib/demo/seed";
import { withTimeout } from "@/lib/utils/timers";
import type { UserSettings } from "@/types";

interface AuthState {
  user: User | null;
  initializing: boolean;
  /** True once the session cookie has been established (or no user). */
  sessionReady: boolean;
  locked: boolean;
  /** True when the signed-in user is an anonymous demo guest. */
  demo: boolean;
  /** Set when establishing the server session fails (never a silent hang). */
  error: string;
  autoLockMin: number;
  unlock: (key: CryptoKey) => void;
  lock: () => void;
  signOut: () => Promise<void>;
  /** Wipe and re-seed the demo workspace. */
  startFresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Generate (or restore) the demo account's random DEK, persisted in settings. */
async function ensureDemoKey(settings: UserSettings | undefined): Promise<CryptoKey> {
  if (settings?.demoDek) {
    try {
      return await importDek(settings.demoDek);
    } catch {
      // Fall through and regenerate if the stored key is corrupt.
    }
  }
  const dek = await generateDek();
  const raw = await exportDek(dek);
  void saveSettings({ demoDek: raw });
  return dek;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [autoLockMin, setAutoLockMin] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    if (demo) return;
    clearSessionKey();
    setLocked(true);
    clearTimer();
  }, [clearTimer, demo]);

  const resetTimer = useCallback(
    (mins: number) => {
      clearTimer();
      if (mins <= 0) return;
      timerRef.current = setTimeout(() => lock(), mins * 60_000);
    },
    [clearTimer, lock],
  );

  const unlock = useCallback(
    (key: CryptoKey) => {
      setSessionKey(key);
      setLocked(false);
      resetTimer(autoLockMin);
    },
    [autoLockMin, resetTimer],
  );

  const signOut = useCallback(async () => {
    clearSessionKey();
    setLocked(false);
    clearTimer();
    await firebaseSignOut(getAuthClient());
  }, [clearTimer]);

  const startFresh = useCallback(async () => {
    await resetDemo();
  }, []);

  // Firebase auth state → session cookie + lock state.
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), async (u) => {
      setUser(u);
      if (u) {
        // Establish the httpOnly session cookie. Every step is bounded by a
        // timeout so a slow/hung admin call can never leave the app on an
        // infinite "Preparing your session…" screen.
        try {
          const token = await withTimeout(
            u.getIdToken(),
            15_000,
            "Couldn't refresh your session (timeout)",
          );
          const session = await withTimeout(
            establishSession(token),
            15_000,
            "Couldn't establish your session (timeout)",
          );
          if (!session.ok) throw new Error(session.error ?? "Couldn't establish your session");
          setError("");
        } catch (e) {
          if (!u.isAnonymous) {
            // Real user: surface the failure so the login page can retry
            // instead of hanging with a disabled button.
            setError((e as Error).message);
            setLocked(true);
            setSessionReady(true);
            setInitializing(false);
            return;
          }
        }

        if (u.isAnonymous) {
          // Demo guests never lock: a local random DEK unlocks everything, and
          // a seed/network failure is non-fatal.
          const settings = await withTimeout(getSettings(), 10_000, "Couldn't load settings").catch(
            () => undefined,
          );
          if (settings?.ok && settings.data.autoLockMin) {
            setAutoLockMin(settings.data.autoLockMin);
          }
          try {
            const key = await ensureDemoKey(settings?.ok ? settings.data : undefined);
            setSessionKey(key);
          } catch (e) {
            setError((e as Error).message);
          }
          setDemo(true);
          setLocked(false);
          setSessionReady(true);
          setInitializing(false);
          await seedDemoData().catch(() => undefined);
          return;
        }

        setDemo(false);
        setLocked(true);
        const settings = await withTimeout(getSettings(), 10_000, "Couldn't load settings").catch(
          () => undefined,
        );
        if (settings?.ok && settings.data.autoLockMin) {
          setAutoLockMin(settings.data.autoLockMin);
        }
      } else {
        clearSessionKey();
        setLocked(false);
        setDemo(false);
        setError("");
        void endSession();
      }
      setSessionReady(true);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Auto-lock on inactivity (never for demo guests).
  useEffect(() => {
    if (locked || !user || demo) return;
    const onActivity = () => resetTimer(autoLockMin);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [locked, user, demo, autoLockMin, resetTimer]);

  const value = useMemo(
    () => ({
      user,
      initializing,
      sessionReady,
      locked,
      demo,
      error,
      autoLockMin,
      unlock,
      lock,
      signOut,
      startFresh,
    }),
    [
      user,
      initializing,
      sessionReady,
      locked,
      demo,
      error,
      autoLockMin,
      unlock,
      lock,
      signOut,
      startFresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
