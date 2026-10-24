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
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type User,
} from "firebase/auth";
import { getAuthClient } from "@/lib/firebase/client";
import { clearSessionKey, setSessionKey } from "@/lib/auth/key-holder";
import { endSession, establishSession } from "@/lib/auth/actions";
import { exportDek, generateDek, importDek } from "@/lib/auth/crypto";
import { getProfile, getSettings, saveProfile, saveSettings } from "@/lib/hydrate";
import { resetDemo, seedDemoData } from "@/lib/demo/seed";
import { withTimeout } from "@/lib/utils/timers";
import {
  isLocalDemoActive,
  enableLocalDemo as setLocalDemoFlag,
  disableLocalDemo,
  clearLocalDemoStorage,
} from "@/lib/demo/local";
import type { UserSettings } from "@/types";

interface AuthState {
  user: User | null;
  initializing: boolean;
  /** True once the session cookie has been established (or no user). */
  sessionReady: boolean;
  locked: boolean;
  /** True when the signed-in user is an anonymous demo guest or local demo. */
  demo: boolean;
  /** Set when establishing the server session fails (never a silent hang). */
  error: string;
  autoLockMin: number;
  setAutoLockMin: (mins: number) => void;
  updateDisplayName: (displayName: string) => Promise<boolean>;
  unlock: (key: CryptoKey) => void;
  lock: () => void;
  signOut: () => Promise<void>;
  /** Wipe and re-seed the demo workspace. */
  startFresh: () => Promise<void>;
  /** Enable client-side local demo fallback mode. */
  enableLocalDemo: () => Promise<void>;
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

function getInitialLocalDemoUser(): User | null {
  if (isLocalDemoActive()) {
    return {
      uid: "demo-guest",
      email: "guest@demo.local",
      displayName: "Demo Guest",
      isAnonymous: true,
      getIdToken: async () => "local_demo_token",
    } as unknown as User;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialLocalDemoUser);
  const [initializing, setInitializing] = useState(() => !isLocalDemoActive());
  const [sessionReady, setSessionReady] = useState(isLocalDemoActive);
  const [locked, setLocked] = useState(false);
  const [demo, setDemo] = useState(isLocalDemoActive);
  const [error, setError] = useState("");
  const [autoLockMin, setAutoLockMinState] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<User | null>(null);
  /** uid of the user who is currently unlocked (PIN verified) on this device. */
  const unlockedUid = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lock = useCallback(() => {
    if (demo) return;
    clearSessionKey();
    unlockedUid.current = null;
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

  const setAutoLockMin = useCallback(
    (mins: number) => {
      setAutoLockMinState(mins);
      if (!locked && userRef.current && !demo) {
        resetTimer(mins);
      }
      void saveSettings({ autoLockMin: mins });
    },
    [locked, demo, resetTimer],
  );

  const updateDisplayName = useCallback(async (displayName: string): Promise<boolean> => {
    const clean = displayName.trim();
    const res = await saveProfile({ displayName: clean });
    if (!isLocalDemoActive()) {
      const current = getAuthClient().currentUser;
      if (current && !current.isAnonymous) {
        await firebaseUpdateProfile(current, { displayName: clean }).catch(() => undefined);
      }
    }
    setUser((prev) => {
      if (!prev) return prev;
      const updated = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, {
        displayName: clean || (prev.isAnonymous ? "Demo Guest" : null),
      }) as User;
      userRef.current = updated;
      return updated;
    });
    return res.ok;
  }, []);

  const unlock = useCallback(
    (key: CryptoKey) => {
      setSessionKey(key);
      unlockedUid.current = userRef.current?.uid ?? null;
      setLocked(false);
      resetTimer(autoLockMin);
    },
    [autoLockMin, resetTimer],
  );

  const signOut = useCallback(async () => {
    clearSessionKey();
    unlockedUid.current = null;
    setLocked(false);
    clearTimer();
    if (typeof document !== "undefined") {
      document.cookie = "stxic_session=; path=/; max-age=0; SameSite=Lax";
    }
    if (isLocalDemoActive()) {
      disableLocalDemo();
      userRef.current = null;
      setDemo(false);
      setUser(null);
      setSessionReady(true);
      return;
    }
    await endSession().catch(() => undefined);
    await firebaseSignOut(getAuthClient()).catch(() => undefined);
  }, [clearTimer]);

  const startFresh = useCallback(async () => {
    if (isLocalDemoActive()) {
      clearLocalDemoStorage();
      await seedDemoData();
      return;
    }
    await resetDemo();
  }, []);

  const enableLocalDemo = useCallback(async () => {
    setLocalDemoFlag();
    setDemo(true);
    setLocked(false);
    const mockUser = {
      uid: "demo-guest",
      email: "guest@demo.local",
      displayName: "Demo Guest",
      isAnonymous: true,
      getIdToken: async () => "local_demo_token",
    } as unknown as User;
    userRef.current = mockUser;
    setUser(mockUser);
    try {
      const key = await ensureDemoKey(undefined);
      setSessionKey(key);
    } catch {
      // ignore
    }
    setSessionReady(true);
    setInitializing(false);
    setError("");
    await seedDemoData().catch(() => undefined);
  }, []);

  // Set up local demo cryptographic key and initial seed on mount
  useEffect(() => {
    if (isLocalDemoActive()) {
      void (async () => {
        try {
          const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
          if (settings.ok && settings.data.autoLockMin) {
            setAutoLockMinState(settings.data.autoLockMin);
          }
          if (profile.ok && profile.data.displayName) {
            setUser((prev) =>
              prev ? ({ ...prev, displayName: profile.data.displayName } as unknown as User) : prev,
            );
          }
          const key = await ensureDemoKey(settings.ok ? settings.data : undefined);
          setSessionKey(key);
        } catch {
          // ignore
        }
        await seedDemoData().catch(() => undefined);
      })();
    }
  }, []);

  // Firebase auth state → session cookie + lock state.
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), async (u) => {
      if (!u && isLocalDemoActive()) {
        return;
      }
      if (u) {
        if (isLocalDemoActive()) {
          disableLocalDemo();
        }
        // Mark session not ready BEFORE setting user so /login waits for the
        // stxic_session cookie before navigating to /pin or /dashboard.
        setSessionReady(false);
        setDemo(u.isAnonymous);
        setLocked(!u.isAnonymous && unlockedUid.current !== u.uid);
        userRef.current = u;
        setUser(u);

        // Establish the session cookie (set client fallback cookie immediately
        // once the ID token resolves so proxy.ts never bounces navigation).
        let token = "";
        try {
          token = await withTimeout(
            u.getIdToken(),
            10_000,
            "Couldn't refresh your session (timeout)",
          );
          if (typeof document !== "undefined" && token) {
            document.cookie = `stxic_session=${token}; path=/; max-age=1209600; SameSite=Lax`;
          }
          const session = await withTimeout(
            establishSession(token),
            6_000,
            "Couldn't establish your session (timeout)",
          );
          if (!session.ok) {
            console.warn("Session action warning:", session.error);
          }
          setError("");
        } catch (e) {
          console.warn("Session establishment non-fatal warning:", e);
          if (typeof document !== "undefined" && token) {
            document.cookie = `stxic_session=${token}; path=/; max-age=1209600; SameSite=Lax`;
          }
        }

        if (u.isAnonymous) {
          // Demo guests never lock: a local random DEK unlocks everything, and
          // a seed/network failure is non-fatal.
          const settings = await withTimeout(getSettings(), 8_000, "Couldn't load settings").catch(
            () => undefined,
          );
          if (settings?.ok && settings.data.autoLockMin) {
            setAutoLockMinState(settings.data.autoLockMin);
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

        // Once a user is unlocked (PIN verified), keep them unlocked through
        // repeated auth-state events — otherwise they'd be sent back to /pin.
        setLocked(unlockedUid.current !== u.uid);
        const [settings, profile] = await Promise.all([
          withTimeout(getSettings(), 8_000, "Couldn't load settings").catch(() => undefined),
          withTimeout(getProfile(), 8_000, "Couldn't load profile").catch(() => undefined),
        ]);
        if (settings?.ok && settings.data.autoLockMin) {
          setAutoLockMinState(settings.data.autoLockMin);
        }
        if (profile?.ok && profile.data.displayName && profile.data.displayName !== u.displayName) {
          setUser((prev) => {
            if (!prev) return prev;
            const updated = Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, {
              displayName: profile.data.displayName,
            }) as User;
            userRef.current = updated;
            return updated;
          });
        }
      } else {
        userRef.current = null;
        setUser(null);
        clearSessionKey();
        setLocked(false);
        setDemo(false);
        setError("");
        if (typeof document !== "undefined") {
          document.cookie = "stxic_session=; path=/; max-age=0; SameSite=Lax";
        }
        void endSession().catch(() => undefined);
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
      setAutoLockMin,
      updateDisplayName,
      unlock,
      lock,
      signOut,
      startFresh,
      enableLocalDemo,
    }),
    [
      user,
      initializing,
      sessionReady,
      locked,
      demo,
      error,
      autoLockMin,
      setAutoLockMin,
      updateDisplayName,
      unlock,
      lock,
      signOut,
      startFresh,
      enableLocalDemo,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
