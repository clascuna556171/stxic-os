"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { getProfile } from "@/lib/hydrate";
import { clearBiometric, saveBiometric } from "@/lib/auth/actions";
import { getSessionKey } from "@/lib/auth/key-holder";
import { exportDek } from "@/lib/auth/crypto";
import { isBiometricAvailable, registerBiometricUnlock } from "@/lib/auth/biometric";
import { isEnabled } from "@/lib/config/features";
import type { BiometricConfig } from "@/types";

interface BiometricCardProps {
  disabled?: boolean;
}

/** Enable/disable WebAuthn biometric unlock for the current user. */
export function BiometricCard({ disabled }: BiometricCardProps) {
  const [configured, setConfigured] = useState<BiometricConfig | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (disabled) return;
    void (async () => {
      const [profile, ok] = await Promise.all([getProfile(), isBiometricAvailable()]);
      if (profile.ok && profile.data.biometric) setConfigured(profile.data.biometric);
      setSupported(ok);
    })();
  }, [disabled]);

  async function enable() {
    const key = getSessionKey();
    if (!key) {
      toast({ title: "Session locked", description: "Unlock Stxic first.", variant: "danger" });
      return;
    }
    setBusy(true);
    try {
      const raw = await exportDek(key);
      const cfg = await registerBiometricUnlock(raw);
      const res = await saveBiometric(cfg);
      if (!res.ok) throw new Error(res.error ?? "Couldn't save biometric config");
      setConfigured(cfg);
      toast({ title: "Biometric unlock enabled", variant: "success" });
    } catch (err) {
      toast({ title: "Setup failed", description: (err as Error).message, variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const res = await clearBiometric();
      if (!res.ok) throw new Error(res.error ?? "Couldn't remove biometric config");
      setConfigured(null);
      toast({ title: "Biometric unlock disabled" });
    } catch (err) {
      toast({ title: "Couldn't disable", description: (err as Error).message, variant: "danger" });
    } finally {
      setBusy(false);
    }
  }

  if (!isEnabled("biometric") || disabled) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Biometric unlock</CardTitle>
          <CardDescription>
            Unlock with your fingerprint or face instead of the PIN.
          </CardDescription>
        </div>
        {supported === false ? (
          <Badge variant="muted">Unsupported on this device</Badge>
        ) : configured ? (
          <Badge variant="success">Enabled</Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="text-muted flex items-center gap-2 text-sm">
          <Fingerprint className="size-4" />
          {supported === false
            ? "This browser or device doesn't support biometric unlock."
            : configured
              ? "Prompted at the unlock screen after auto-lock."
              : "Register your device to unlock Stxic without a PIN."}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {configured ? (
            <Button variant="secondary" onClick={() => void disable()} disabled={busy}>
              {busy ? "Working…" : "Disable"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => void enable()}
              disabled={busy || supported === false}
            >
              {busy ? "Setting up…" : "Enable"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
