"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme/theme-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { BackupCard } from "@/components/features/backup/backup-card";
import { ObsidianSettingsCard } from "@/components/features/obsidian/obsidian-settings-card";
import { BiometricCard } from "@/components/features/auth/biometric-card";
import { PushCard } from "@/components/features/push/push-card";
import { PRESET_LIST, hexToHue, hueToHex } from "@/lib/theme";
import { getSettings, saveSettings } from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";

const AUTO_LOCK_OPTIONS = [1, 2, 5, 10, 15, 30, 60];

export default function SettingsPage() {
  const { theme, preset, accent, setTheme, setPreset, setAccent } = useTheme();
  const { demo } = useAuth();
  const [autoLockMin, setAutoLockMin] = useState(5);

  useEffect(() => {
    void getSettings().then((res) => {
      if (res.ok && res.data.autoLockMin) setAutoLockMin(res.data.autoLockMin);
    });
  }, []);

  function onAutoLockChange(value: string) {
    const mins = Number(value);
    setAutoLockMin(mins);
    void saveSettings({ autoLockMin: mins });
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted text-sm">Appearance and security preferences.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme, accent, and presets apply instantly — no reload.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme" className="mb-0">
              Dark mode
            </Label>
            <Switch
              id="theme"
              checked={theme === "dark"}
              onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
            />
          </div>

          <div>
            <Label>Preset</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESET_LIST.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPreset(p.name)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                    preset === p.name
                      ? "border-accent bg-surface-2"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <span
                    className="size-5 rounded-full"
                    style={{ background: p.accent }}
                    aria-hidden
                  />
                  <span className="text-foreground text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="accent">Accent</Label>
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
            </div>
            <p className="text-muted mt-1.5 text-xs">Live preview — saved to your settings.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Auto-lock after a period of inactivity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="autolock" className="mb-0">
              Auto-lock after
            </Label>
            <Select value={String(autoLockMin)} onValueChange={onAutoLockChange}>
              <SelectTrigger id="autolock" className="w-32">
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
        </CardContent>
      </Card>

      <BiometricCard disabled={demo} />

      <PushCard disabled={demo} />

      <BackupCard disabled={demo} />

      <ObsidianSettingsCard disabled={demo} />
    </div>
  );
}
