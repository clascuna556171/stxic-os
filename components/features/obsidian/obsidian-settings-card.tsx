"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Plug, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { getObsidianConfig, saveObsidianConfig } from "@/lib/hydrate";
import { createObsidianClient } from "@/lib/obsidian/client";
import { cn } from "@/lib/utils/cn";
import type { ObsidianSettings } from "@/types";

const HTTPS_DEFAULT = "https://127.0.0.1:27124";
const HTTP_DEFAULT = "http://127.0.0.1:27123";

const DEFAULTS: ObsidianSettings = {
  enabled: false,
  baseUrl: HTTPS_DEFAULT,
  insecure: false,
  encryptedKey: "",
  mcpUrl: "",
};

export function ObsidianSettingsCard({ disabled = false }: { disabled?: boolean }) {
  const [cfg, setCfg] = useState<ObsidianSettings | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getObsidianConfig().then((res) => {
      if (res.ok) setCfg({ ...DEFAULTS, ...res.data });
      else setCfg(DEFAULTS);
    });
  }, []);

  function patch(partial: Partial<ObsidianSettings>) {
    setCfg((c) => (c ? { ...c, ...partial } : c));
    setStatus(null);
  }

  async function persist(next: ObsidianSettings) {
    setSaving(true);
    const res = await saveObsidianConfig(next);
    setSaving(false);
    if (!res.ok) {
      toast({
        title: "Couldn't save Obsidian settings",
        description: res.error,
        variant: "danger",
      });
    } else {
      toast({ title: "Saved", variant: "success" });
    }
  }

  function onSave() {
    if (!cfg) return;
    const mcpUrl = `${cfg.baseUrl.replace(/\/+$/, "")}/mcp/`;
    void persist({ ...cfg, mcpUrl });
  }

  function onToggleInsecure(on: boolean) {
    patch({ baseUrl: on ? HTTP_DEFAULT : HTTPS_DEFAULT, insecure: on });
  }

  async function testConnection() {
    if (!cfg) return;
    setTesting(true);
    setStatus(null);
    const client = createObsidianClient({
      baseUrl: cfg.baseUrl,
      insecure: cfg.insecure,
      apiKey: cfg.encryptedKey,
    });
    const res = await client.getStatus();
    setTesting(false);
    if (res.ok) {
      const version = res.data.version;
      setStatus({
        ok: true,
        text: `Connected to Obsidian${version ? ` (v${version})` : ""}.`,
      });
      const next = { ...cfg, lastConnectedAt: Date.now() };
      setCfg(next);
      void saveObsidianConfig(next);
    } else {
      setStatus({ ok: false, text: res.error.message });
    }
  }

  async function copyMcpConfig() {
    if (!cfg) return;
    const mcpUrl = `${cfg.baseUrl.replace(/\/+$/, "")}/mcp/`;
    const json = JSON.stringify(
      {
        mcpServers: {
          obsidian: {
            type: "http",
            url: mcpUrl,
            headers: { Authorization: `Bearer ${cfg.encryptedKey || "<api-key>"}` },
          },
        },
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(json);
      toast({ title: "MCP config copied", description: "For future AI use (no agent yet)." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard unavailable.", variant: "danger" });
    }
  }

  const maskedKey = cfg?.encryptedKey
    ? `${"\u2022".repeat(8)}${cfg.encryptedKey.slice(-4)}`
    : "Not set";
  const mcpUrl = cfg ? `${cfg.baseUrl.replace(/\/+$/, "")}/mcp/` : "";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Obsidian sync</CardTitle>
          <CardDescription>
            Live two-way bridge with your local vault via the Local REST API plugin.
          </CardDescription>
        </div>
        <Badge variant="muted">
          <Plug className="size-3.5" />
          Local
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="obsidian-enabled" className="mb-0">
            Enable Obsidian
          </Label>
          <Switch
            id="obsidian-enabled"
            disabled={disabled}
            checked={cfg?.enabled ?? false}
            onCheckedChange={(on) => patch({ enabled: on })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="obsidian-url">Base URL</Label>
            <Input
              id="obsidian-url"
              disabled={disabled || !cfg?.enabled}
              value={cfg?.baseUrl ?? ""}
              onChange={(e) => patch({ baseUrl: e.target.value })}
              placeholder={HTTPS_DEFAULT}
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="obsidian-key">API key</Label>
            <Input
              id="obsidian-key"
              type="password"
              autoComplete="off"
              disabled={disabled || !cfg?.enabled}
              value={cfg?.encryptedKey ?? ""}
              onChange={(e) => patch({ encryptedKey: e.target.value })}
              placeholder="Paste from Obsidian → Local REST API"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="obsidian-insecure" className="mb-0">
              HTTP fallback (port 27123)
            </Label>
            <p className="text-muted text-xs">
              Use when the self-signed cert is untrusted. Loopback is still Bearer-protected.
            </p>
          </div>
          <Switch
            id="obsidian-insecure"
            disabled={disabled || !cfg?.enabled}
            checked={cfg?.insecure ?? false}
            onCheckedChange={onToggleInsecure}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => void testConnection()}
            disabled={disabled || !cfg?.enabled || testing}
          >
            {testing ? "Testing…" : "Test Connection"}
          </Button>
          <Button variant="secondary" onClick={onSave} disabled={disabled || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {status ? (
            <span
              className={cn(
                "flex items-center gap-1.5 text-sm",
                status.ok ? "text-success" : "text-danger",
              )}
            >
              {status.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
              {status.text}
            </span>
          ) : null}
        </div>

        {disabled ? (
          <p className="text-muted text-xs">Obsidian sync is unavailable in demo mode.</p>
        ) : null}

        <div className="border-border space-y-2 border-t pt-4">
          <div>
            <Label>MCP config (for future AI use)</Label>
            <p className="text-muted text-xs">
              Endpoint <span className="font-mono">{mcpUrl}</span> · API key{" "}
              <span className="font-mono">{maskedKey}</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void copyMcpConfig()}>
            <Copy />
            Copy MCP config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
