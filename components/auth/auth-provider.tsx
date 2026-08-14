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
import { getSettings } from "@/lib/hydrate";

interface AuthState {
  user: User | null;
  initializing: boolean;
  locked: boolean;
  autoLockMin: number;
  unlock: (key: CryptoKey) => void;
  lock: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [locked, setLocked] = useState(false);
  const [autoLockMin, setAutoLockMin] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    clearSessionKey();
    setLocked(true);
    clearTimer();
  }, [clearTimer]);

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

  // Firebase auth state → session cookie + lock state.
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), async (u) => {
      setUser(u);
      if (u) {
        try {
          const token = await u.getIdToken();
          await establishSession(token);
          const settings = await getSettings();
          if (settings.ok && settings.data.autoLockMin) {
            setAutoLockMin(settings.data.autoLockMin);
          }
        } catch {
          // Session establishment is best-effort; Firestore rules enforce.
        }
        setLocked(true);
      } else {
        clearSessionKey();
        setLocked(false);
        void endSession();
      }
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Auto-lock on inactivity.
  useEffect(() => {
    if (locked || !user) return;
    const onActivity = () => resetTimer(autoLockMin);
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [locked, user, autoLockMin, resetTimer]);

  const value = useMemo(
    () => ({ user, initializing, locked, autoLockMin, unlock, lock, signOut }),
    [user, initializing, locked, autoLockMin, unlock, lock, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
