"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { KeyRound, Lock, LogOut, Mail, RotateCcw, ShieldCheck, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { useTheme } from "@/components/theme/theme-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { getAuthClient } from "@/lib/firebase/client";
import { BackupCard } from "@/components/features/backup/backup-card";
import { ObsidianSettingsCard } from "@/components/features/obsidian/obsidian-settings-card";
import { BiometricCard } from "@/components/features/auth/biometric-card";
import { PushCard } from "@/components/features/push/push-card";
import { PRESETS, PRESET_LIST, hexToHue, hueToHex } from "@/lib/theme";
import { getProfile, getSettings, saveSettings } from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";
import type { Currency } from "@/types";

const AUTO_LOCK_OPTIONS = [1, 2, 5, 10, 15, 30, 60];
const CURRENCY_OPTIONS: Array<{ value: Currency; label: string }> = [
  { value: "PHP", label: "PHP (₱) — Philippine Peso" },
  { value: "USD", label: "USD ($) — US Dollar" },
  { value: "EUR", label: "EUR (€) — Euro" },
  { value: "JPY", label: "JPY (¥) — Japanese Yen" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, preset, accent, setTheme, setPreset, setAccent } = useTheme();
  const {
    user,
    demo,
    autoLockMin,
    setAutoLockMin,
    updateDisplayName,
    lock,
    signOut,
    startFresh,
  } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("PHP");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [settingsRes, profileRes] = await Promise.all([getSettings(), getProfile()]);
      if (cancelled) return;
      if (settingsRes.ok && settingsRes.data.defaultCurrency) {
        setDefaultCurrency(settingsRes.data.defaultCurrency);
      }
      if (profileRes.ok && profileRes.data.displayName) {
        setDisplayName(profileRes.data.displayName);
      } else if (user?.displayName) {
        setDisplayName(user.displayName);
      } else if (user?.email) {
        setDisplayName(user.email.split("@")[0] ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function onAutoLockChange(value: string) {
    const mins = Number(value);
    setAutoLockMin(mins);
    toast({ title: "Auto-lock updated", description: `Vault locks after ${mins} min${mins === 1 ? "" : "s"} of inactivity.` });
  }

  function onCurrencyChange(value: string) {
    const next = value as Currency;
    setDefaultCurrency(next);
    void saveSettings({ defaultCurrency: next }).then((res) => {
      if (res.ok) {
        toast({ title: "Default currency saved", description: `Default currency set to ${next}.` });
      }
    });
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const ok = await updateDisplayName(displayName);
      if (ok) {
        toast({ title: "Account updated", description: "Your display name has been saved.", variant: "success" });
      } else {
        toast({ title: "Couldn't save profile", variant: "danger" });
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSendPasswordReset() {
    if (demo || !user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(getAuthClient(), user.email);
      toast({
        title: "Password reset email sent",
        description: `Check ${user.email} for instructions.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Couldn't send reset email",
        description: (err as Error).message,
        variant: "danger",
      });
    } finally {
      setSendingReset(false);
    }
  }

  function onLockNow() {
    if (demo) return;
    lock();
    router.replace("/pin");
  }

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  const emailDisplay = demo ? "guest@demo.local" : (user?.email ?? "No email on file");
  const avatarInitial = (displayName.trim() || emailDisplay).charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Account &amp; Settings</h2>
          <p className="text-muted text-sm">Manage your profile, workspace currency, appearance, and vault security.</p>
        </div>
        <Badge variant={demo ? "warning" : "success"} className="gap-1.5">
          <ShieldCheck className="size-3.5" />
          {demo ? "Demo Sandbox" : "AES-GCM Encrypted"}
        </Badge>
      </header>

      {/* Account & Workspace */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Profile identity, default workspace currency, and active session controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="border-border bg-surface-2/40 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="border-border bg-surface text-accent flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
                {avatarInitial || <UserIcon className="size-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-foreground truncate text-sm font-semibold">
                  {displayName.trim() || (demo ? "Demo Guest" : "Stxic User")}
                </p>
                <p className="text-muted truncate text-xs font-mono">{emailDisplay}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {demo ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void startFresh().then(() => {
                      toast({ title: "Demo workspace reset", variant: "success" });
                    });
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  Reset demo data
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={onLockNow}>
                  <Lock className="size-3.5" />
                  Lock vault
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => void onSignOut()}
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </div>
          </div>

          <form onSubmit={onSaveProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="account-display-name">Display name</Label>
              <div className="flex gap-2">
                <Input
                  id="account-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name or handle"
                  maxLength={60}
                />
                <Button type="submit" variant="primary" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="default-currency">Default currency</Label>
              <Select value={defaultCurrency} onValueChange={onCurrencyChange}>
                <SelectTrigger id="default-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security & Access */}
      <Card>
        <CardHeader>
          <CardTitle>Security &amp; Access</CardTitle>
          <CardDescription>
            PIN lock timeout, PIN rotation, and account password recovery.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="autolock" className="mb-0">
                Auto-lock after inactivity
              </Label>
              <p className="text-muted text-xs">
                Clears your in-memory encryption key after the selected idle period.
              </p>
            </div>
            <Select value={String(autoLockMin)} onValueChange={onAutoLockChange} disabled={demo}>
              <SelectTrigger id="autolock" className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTO_LOCK_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min{m === 1 ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <p className="text-foreground text-sm font-medium">Credentials &amp; PIN</p>
              <p className="text-muted text-xs">
                {demo
                  ? "PIN and password changes are disabled in the guest demo sandbox."
                  : "Rotate your 4–6 digit unlock PIN or send a password reset link to your email."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={demo}
                onClick={() => router.push("/pin?mode=change")}
              >
                <KeyRound className="size-3.5" />
                Change PIN
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={demo || !user?.email || sendingReset}
                onClick={() => void onSendPasswordReset()}
              >
                <Mail className="size-3.5" />
                {sendingReset ? "Sending…" : "Reset password"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme, accent, and presets apply instantly — no reload.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme" className="mb-0">
                Dark mode
              </Label>
              <p className="text-muted text-xs">High-contrast dark surfaces tuned for low glare.</p>
            </div>
            <Switch
              id="theme"
              checked={theme === "dark"}
              onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
            />
          </div>

          <div>
            <Label>Theme preset</Label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {PRESET_LIST.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPreset(p.name)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors cursor-pointer",
                    preset === p.name
                      ? "border-accent bg-surface-2"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <span
                    className="size-5 rounded-full border border-white/10"
                    style={{ background: p.accent }}
                    aria-hidden
                  />
                  <span className="text-foreground text-xs font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="accent" className="mb-0">
                Custom accent
              </Label>
              <button
                type="button"
                onClick={() => setAccent(PRESETS[preset].accent)}
                className="text-muted hover:text-foreground text-xs transition-colors"
              >
                Reset to preset ({PRESETS[preset].accent.toUpperCase()})
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="accent"
                type="range"
                min={0}
                max={360}
                value={hexToHue(accent)}
                onChange={(e) => setAccent(hueToHex(Number(e.target.value)))}
                className="bg-surface-2 h-1.5 flex-1 cursor-pointer appearance-none rounded-full accent-[var(--accent)]"
              />
              <span
                className="border-border size-7 shrink-0 rounded-full border"
                style={{ background: accent }}
                aria-hidden
              />
              <span className="text-muted w-16 font-mono text-xs uppercase">{accent}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <BiometricCard disabled={demo} />

      <PushCard disabled={demo} />

      <BackupCard disabled={demo} />

      <ObsidianSettingsCard disabled={demo} />
    </div>
  );
}
