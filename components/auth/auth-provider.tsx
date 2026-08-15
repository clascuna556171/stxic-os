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
        try {
          const token = await u.getIdToken();
          const session = await establishSession(token);
          if (!session.ok) throw new Error(session.error ?? "Couldn't establish your session");
          setError("");
          const settings = await getSettings();
          if (settings.ok && settings.data.autoLockMin) {
            setAutoLockMin(settings.data.autoLockMin);
          }

          if (u.isAnonymous) {
            const key = await ensureDemoKey(settings.ok ? settings.data : undefined);
            setSessionKey(key);
            setDemo(true);
            setLocked(false);
            await seedDemoData();
          } else {
            setDemo(false);
            setLocked(true);
          }
        } catch (e) {
          setError((e as Error).message);
          setLocked(true);
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
