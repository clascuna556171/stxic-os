"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { PinDots, PinPad } from "@/components/auth/pin-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile, getSettings, saveProfile, saveSettings } from "@/lib/hydrate";
import { setPin, saveMasterPassword, verifyPin } from "@/lib/auth/actions";
import { withTimeout } from "@/lib/utils/timers";
import {
  constantTimeEqual,
  deriveKey,
  encryptString,
  exportDek,
  generateDek,
  generateSalt,
  hashSecret,
  importDek,
  unwrapDek,
  wrapDek,
} from "@/lib/auth/crypto";
import { passwordStrength } from "@/lib/strength";
import { isBiometricAvailable, unlockWithBiometric } from "@/lib/auth/biometric";
import { getSessionKey } from "@/lib/auth/key-holder";
import { BrandMark } from "@/components/brand/brand-mark";
import type { BiometricConfig } from "@/types";

type Phase = "loading" | "verify" | "onboardMaster" | "onboardPin" | "recoverMaster" | "recoverPin";

export default function PinPage() {
  const { user, initializing, unlock, demo, signOut } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [isChangeMode] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "change",
  );
  const [pin, setPinState] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [firstPin, setFirstPin] = useState("");
  const [master, setMaster] = useState("");
  const [masterConfirm, setMasterConfirm] = useState("");
  const [dekRaw, setDekRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [biometricCfg, setBiometricCfg] = useState<BiometricConfig | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);

  // Guard: require a signed-in user; demo guests skip the PIN gate.
  useEffect(() => {
    if (demo) router.replace("/dashboard");
    else if (!initializing && !user) router.replace("/login");
  }, [initializing, user, demo, router]);

  // Decide onboarding vs verify vs change-pin; load biometric config when present.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const settings = await withTimeout(getSettings(), 6_000, "Settings load timeout");
        if (cancelled) return;
        if (!settings.ok) {
          setPhase("onboardMaster");
          return;
        }
        if (isChangeMode && settings.data.pinHash) {
          const activeKey = getSessionKey();
          if (activeKey) {
            try {
              const raw = await exportDek(activeKey);
              if (cancelled) return;
              setDekRaw(raw);
              setPhase("recoverPin");
              return;
            } catch {
              // Fall through to verify PIN first
            }
          }
        }
        setPhase(settings.data.pinHash ? "verify" : "onboardMaster");
        const profile = await withTimeout(getProfile(), 5_000, "Profile load timeout").catch(
          () => undefined,
        );
        if (!cancelled && profile?.ok && profile.data.biometric) {
          setBiometricCfg(profile.data.biometric);
        }
      } catch {
        if (!cancelled) {
          setPhase("onboardMaster");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isChangeMode]);

  const setPinValue = (v: string) => {
    setError("");
    setPinState(v);
  };

  const addDigit = useCallback(
    (d: string) => {
      if (pin.length < 6) setPinValue(pin + d);
    },
    [pin],
  );

  const backspace = useCallback(() => {
    setPinValue(pin.slice(0, -1));
  }, [pin]);

  const finalizePin = useCallback(
    async (rawDek: string) => {
      setBusy(true);
      setError("");
      try {
        const pinSalt = generateSalt();
        const pinHash = await hashSecret(pin, pinSalt);
        const wrappedDekPin = await wrapDek(pin, pinSalt, rawDek);
        const [settingsSaved, profileSaved, serverSaved] = await Promise.all([
          saveSettings({ pinSalt, pinHash, wrappedDekPin }),
          saveProfile({ hasPin: true }),
          withTimeout(setPin({ pinSalt, pinHash, wrappedDekPin }), 5_000, "PIN save timeout").catch(
            () => ({ ok: false as const, error: "Server PIN save skipped" }),
          ),
        ]);
        if (!settingsSaved.ok && !profileSaved.ok && !serverSaved.ok) {
          setError(serverSaved.error || "Failed to save PIN. Try again.");
          setBusy(false);
          return;
        }
        const dek = await importDek(rawDek);
        unlock(dek);
        router.replace(isChangeMode ? "/settings" : "/dashboard");
      } catch {
        setError("Failed to save PIN. Try again.");
        setBusy(false);
      }
    },
    [pin, unlock, router, isChangeMode],
  );

  const handleBiometric = useCallback(async () => {
    if (!biometricCfg) return;
    setBiometricBusy(true);
    setError("");
    try {
      const raw = await unlockWithBiometric(biometricCfg);
      const dek = await importDek(raw);
      unlock(dek);
      router.replace("/dashboard");
    } catch {
      setError("Biometric unlock failed. Use your PIN instead.");
    } finally {
      setBiometricBusy(false);
    }
  }, [biometricCfg, unlock, router]);

  const handleVerify = useCallback(async () => {
    if (pin.length < 4) return;
    setBusy(true);
    setError("");
    try {
      // Check client-side settings first (supports local cache + Firestore)
      try {
        const settings = await withTimeout(getSettings(), 5_000, "Settings load timeout");
        if (
          settings.ok &&
          settings.data.pinSalt &&
          settings.data.pinHash &&
          settings.data.wrappedDekPin
        ) {
          const hash = await hashSecret(pin, settings.data.pinSalt);
          if (constantTimeEqual(hash, settings.data.pinHash)) {
            const raw = await unwrapDek(pin, settings.data.pinSalt, settings.data.wrappedDekPin);
            const dek = await importDek(raw);
            unlock(dek);
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // Fall through to server action verification
      }

      const res = await withTimeout(verifyPin(pin), 5_000, "PIN verify timeout").catch(() => ({
        ok: false as const,
        error: "Incorrect PIN",
      }));
      if (res.ok) {
        const raw = await unwrapDek(pin, res.data.pinSalt, res.data.wrappedDekPin);
        const dek = await importDek(raw);
        unlock(dek);
        router.replace("/dashboard");
        return;
      }

      setError("Incorrect PIN.");
      setPinState("");
      setBusy(false);
    } catch {
      setError("Incorrect PIN.");
      setPinState("");
      setBusy(false);
    }
  }, [pin, unlock, router]);

  const handleOnboardMaster = useCallback(async () => {
    if (master.length < 8 || master !== masterConfirm) {
      setError(master !== masterConfirm ? "Passwords do not match." : "Use at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const salt = generateSalt();
      const kek = await deriveKey(master, salt);
      const dek = await generateDek();
      const raw = await exportDek(dek);
      const wrapped = await encryptString(kek, raw);
      const [profileSaved, serverSaved] = await Promise.all([
        saveProfile({
          encKeySalt: salt,
          wrappedDekMaster: wrapped,
          email: user?.email ?? "",
          plan: "free",
        }),
        withTimeout(
          saveMasterPassword({ encKeySalt: salt, wrappedDekMaster: wrapped }),
          5_000,
          "Master password save timeout",
        ).catch(() => ({ ok: false as const, error: "Server master password save skipped" })),
      ]);
      if (!profileSaved.ok && !serverSaved.ok) {
        setError(serverSaved.error || "Failed to save master password. Try again.");
        setBusy(false);
        return;
      }
      setDekRaw(raw);
      setPhase("onboardPin");
      setBusy(false);
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }, [master, masterConfirm, user]);

  const handleRecoverMaster = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const profile = await getProfile();
      if (!profile.ok || !profile.data.encKeySalt) {
        setError("Master password recovery is unavailable.");
        setBusy(false);
        return;
      }
      const raw = await unwrapDek(master, profile.data.encKeySalt, profile.data.wrappedDekMaster);
      setDekRaw(raw);
      setPhase("recoverPin");
      setBusy(false);
    } catch {
      setError("Incorrect master password.");
      setBusy(false);
    }
  }, [master]);

  const handleSetPinSubmit = useCallback(() => {
    if (pin.length < 4) return;
    setError("");
    if (!confirming) {
      setFirstPin(pin);
      setConfirming(true);
      setPinState("");
      return;
    }
    if (pin !== firstPin) {
      setError("PINs don't match. Try again.");
      setConfirming(false);
      setFirstPin("");
      setPinState("");
      return;
    }
    void finalizePin(dekRaw);
  }, [pin, confirming, firstPin, dekRaw, finalizePin]);

  useEffect(() => {
    if (phase !== "verify" && phase !== "onboardPin" && phase !== "recoverPin") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Enter" && pin.length >= 4 && !busy) {
        e.preventDefault();
        if (phase === "verify") void handleVerify();
        else handleSetPinSubmit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, pin, busy, addDigit, backspace, handleVerify, handleSetPinSubmit]);

  if (phase === "loading" || initializing) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </main>
    );
  }

  const strength = passwordStrength(master);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-2.5">
        <BrandMark size={32} />
        <span className="text-foreground text-xl font-semibold tracking-tight">Stxic</span>
      </div>

      <Card className="w-full max-w-sm">
        {phase === "verify" ? (
          <>
            <CardHeader className="items-center text-center">
              <CardTitle>Enter your PIN</CardTitle>
              <CardDescription>Unlock Stxic to continue.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <PinDots value={pin} />
              <PinPad
                onDigit={addDigit}
                onBackspace={backspace}
                disabled={busy}
                maxLength={6}
                value={pin}
              />
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              ) : null}
              <Button
                variant="primary"
                className="w-full"
                disabled={pin.length < 4 || busy}
                onClick={() => void handleVerify()}
              >
                {busy ? "Unlocking…" : "Unlock"}
              </Button>
              <div className="flex w-full flex-col items-center gap-2">
                <button
                  type="button"
                  className="text-muted hover:text-foreground text-xs"
                  onClick={() => {
                    setPhase("recoverMaster");
                    setPinState("");
                    setError("");
                  }}
                >
                  Forgot PIN?
                </button>
                <BiometricButton
                  available={biometricCfg !== null}
                  busy={biometricBusy}
                  onClick={() => void handleBiometric()}
                />
              </div>
            </CardContent>
          </>
        ) : null}

        {phase === "onboardMaster" ? (
          <>
            <CardHeader>
              <CardTitle>Set your master password</CardTitle>
              <CardDescription>
                Encrypts everything on this device. It&apos;s never stored — only you can recover
                your data with it.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label htmlFor="master">Master password</Label>
                <Input
                  id="master"
                  type="password"
                  value={master}
                  onChange={(e) => setMaster(e.target.value)}
                  placeholder="At least 8 characters"
                />
                {master ? (
                  <p className="text-muted mt-1.5 text-xs">
                    Strength: <span className="text-foreground">{strength.label}</span>
                    <span className="ml-2 inline-flex gap-0.5 align-middle">
                      {[1, 2, 3, 4].map((s) => (
                        <span
                          key={s}
                          className={
                            s <= strength.score
                              ? "bg-accent h-1 w-4 rounded-full"
                              : "bg-surface-2 h-1 w-4 rounded-full"
                          }
                        />
                      ))}
                    </span>
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="master-confirm">Confirm password</Label>
                <Input
                  id="master-confirm"
                  type="password"
                  value={masterConfirm}
                  onChange={(e) => setMasterConfirm(e.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              ) : null}
              <Button
                variant="primary"
                className="w-full"
                disabled={busy}
                onClick={() => void handleOnboardMaster()}
              >
                {busy ? "Preparing…" : "Continue"}
              </Button>
            </CardContent>
          </>
        ) : null}

        {(phase === "onboardPin" || phase === "recoverPin") && dekRaw ? (
          <>
            <CardHeader className="items-center text-center">
              <CardTitle>{confirming ? "Confirm your PIN" : "Set a PIN"}</CardTitle>
              <CardDescription>
                {phase === "recoverPin"
                  ? "Choose a new 4–6 digit PIN."
                  : "Quick unlock for daily use."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <PinDots value={pin} />
              <PinPad
                onDigit={addDigit}
                onBackspace={backspace}
                disabled={busy}
                maxLength={6}
                value={pin}
              />
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              ) : null}
              <Button
                variant="primary"
                className="w-full"
                disabled={pin.length < 4 || busy}
                onClick={handleSetPinSubmit}
              >
                {busy ? "Saving…" : confirming ? "Confirm" : "Continue"}
              </Button>
            </CardContent>
          </>
        ) : null}

        {phase === "recoverMaster" ? (
          <>
            <CardHeader>
              <CardTitle>Recover with master password</CardTitle>
              <CardDescription>Enter your master password to reset your PIN.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Label htmlFor="recover-master">Master password</Label>
                <Input
                  id="recover-master"
                  type="password"
                  value={master}
                  onChange={(e) => setMaster(e.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              ) : null}
              <Button
                variant="primary"
                className="w-full"
                disabled={busy || !master}
                onClick={() => void handleRecoverMaster()}
              >
                {busy ? "Checking…" : "Continue"}
              </Button>
              <button
                type="button"
                className="text-muted hover:text-foreground text-xs"
                onClick={() => {
                  setPhase("verify");
                  setError("");
                }}
              >
                Back to PIN
              </button>
            </CardContent>
          </>
        ) : null}
      </Card>
      <div className="flex flex-col items-center gap-2 text-center">
        {isChangeMode ? (
          <button
            type="button"
            className="text-accent hover:underline text-xs font-medium transition-colors"
            onClick={() => router.replace("/settings")}
          >
            Cancel and return to settings
          </button>
        ) : null}
        <button
          type="button"
          className="text-muted hover:text-foreground text-xs transition-colors"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          Sign out of this account
        </button>
      </div>
    </main>
  );
}

function BiometricButton({
  available,
  busy,
  onClick,
}: {
  available: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isBiometricAvailable().then((ok) => {
      if (!cancelled) setSupported(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (supported !== true || !available) return null;

  return (
    <Button variant="ghost" className="w-full" disabled={busy} onClick={onClick}>
      {busy ? "Checking…" : "Use biometric"}
    </Button>
  );
}
