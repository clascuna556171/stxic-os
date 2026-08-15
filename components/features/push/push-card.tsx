"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import {
  hasPushPermission,
  requestPushToken,
  removePushToken,
} from "@/lib/push/messaging";
import { isEnabled } from "@/lib/config/features";
import { cn } from "@/lib/utils/cn";

interface PushCardProps {
  disabled?: boolean;
}

/** Browser push notification toggle. */
export function PushCard({ disabled }: PushCardProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (disabled) return;
    void (async () => {
      const granted = await hasPushPermission();
      setPermission(granted ? "granted" : "default");
    })();
  }, [disabled]);

  if (!isEnabled("push") || disabled) return null;

  async function enable() {
    setBusy(true);
    try {
      const res = await requestPushToken();
      if (!res.ok) {
        toast({ title: "Couldn't enable", description: res.error, variant: "danger" });
        return;
      }
      setPermission("granted");
      toast({ title: "Notifications enabled", variant: "success" });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const res = await removePushToken();
      if (!res.ok) {
        toast({ title: "Couldn't disable", description: res.error, variant: "danger" });
        return;
      }
      setPermission("default");
      toast({ title: "Notifications disabled" });
    } finally {
      setBusy(false);
    }
  }

  const enabled = permission === "granted";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Push notifications</CardTitle>
          <CardDescription>Get notified for focus, tasks, and digests.</CardDescription>
        </div>
        {permission === "unsupported" ? (
          <Badge variant="muted">Unsupported</Badge>
        ) : (
          <Switch
            checked={enabled}
            onCheckedChange={(on) => void (on ? enable() : disable())}
            disabled={busy}
            aria-label="Push notifications"
          />
        )}
      </CardHeader>
      <CardContent>
        <div className={cn("text-muted flex items-center gap-2 text-sm")}>
          <Bell className="size-4" />
          {permission === "unsupported"
            ? "This browser doesn't support web notifications."
            : enabled
              ? "You'll get notifications even when Stxic is closed."
              : "Enable browser notifications to get reminded."}
        </div>
        {!enabled && permission !== "unsupported" ? (
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => void enable()}
            disabled={busy}
          >
            {busy ? "Requesting…" : "Enable notifications"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
