"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { PinDots, PinPad } from "@/components/auth/pin-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile, getSettings } from "@/lib/hydrate";
import { setPin, saveMasterPassword, verifyPin } from "@/lib/auth/actions";
import {
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

type Phase = "loading" | "verify" | "onboardMaster" | "onboardPin" | "recoverMaster" | "recoverPin";

export default function PinPage() {
  const { user, initializing, unlock } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [pin, setPinState] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [firstPin, setFirstPin] = useState("");
  const [master, setMaster] = useState("");
  const [masterConfirm, setMasterConfirm] = useState("");
  const [dekRaw, setDekRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Guard: require a signed-in user.
  useEffect(() => {
    if (!initializing && !user) router.replace("/login");
  }, [initializing, user, router]);

  // Decide onboarding vs verify.
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const settings = await getSettings();
      if (!settings.ok) {
        setError("Could not load your settings. Try signing in again.");
        return;
      }
      setPhase(settings.data.pinHash ? "verify" : "onboardMaster");
    })();
  }, [user]);

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
        const res = await setPin({ pinSalt, pinHash, wrappedDekPin });
        if (!res.ok) {
          setError(res.error);
          setBusy(false);
          return;
        }
        const dek = await importDek(rawDek);
        unlock(dek);
        router.replace("/dashboard");
      } catch {
        setError("Failed to save PIN. Try again.");
        setBusy(false);
      }
    },
    [pin, unlock, router],
  );

  const handleVerify = useCallback(async () => {
    if (pin.length < 4) return;
    setBusy(true);
    setError("");
    try {
      const res = await verifyPin(pin);
      if (!res.ok) {
        setError("Incorrect PIN.");
        setPinState("");
        setBusy(false);
        return;
      }
      const raw = await unwrapDek(pin, res.data.pinSalt, res.data.wrappedDekPin);
      const dek = await importDek(raw);
      unlock(dek);
      router.replace("/dashboard");
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
      const res = await saveMasterPassword({ encKeySalt: salt, wrappedDekMaster: wrapped });
      if (!res.ok) {
        setError(res.error);
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
  }, [master, masterConfirm]);

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

  if (phase === "loading" || initializing) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-muted text-sm">Loading…</p>
      </main>
    );
  }

  const strength = passwordStrength(master);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        {phase === "verify" ? (
          <>
            <CardHeader className="items-center text-center">
              <CardTitle>Enter your PIN</CardTitle>
              <CardDescription>Unlock Stxic to continue.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <PinDots value={pin} />
              <PinPad onDigit={addDigit} onBackspace={backspace} disabled={busy} />
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
              <PinPad onDigit={addDigit} onBackspace={backspace} disabled={busy} />
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
    </main>
  );
}
