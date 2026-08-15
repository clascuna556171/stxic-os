"use client";

import { useEffect, useState } from "react";
import { Link2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { syncBlackboard } from "@/lib/blackboard/sync";
import { riskLabel, riskScore, type RiskLevel } from "@/lib/blackboard/risk";
import { getBlackboard, getSettings, saveSettings } from "@/lib/hydrate";
import { formatDate, relativeTime } from "@/lib/utils/dates";
import type { BlackboardEvent } from "@/types";

const RISK_VARIANT: Record<RiskLevel, "muted" | "warning" | "danger"> = {
  Low: "muted",
  Med: "warning",
  High: "danger",
  Critical: "danger",
};

export function BlackboardPanel({ onSynced }: { onSynced: () => void }) {
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [icalUrl, setIcalUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [events, setEvents] = useState<BlackboardEvent[]>([]);
  const [lastSync, setLastSync] = useState<number | undefined>();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [s, b] = await Promise.all([getSettings(), getBlackboard()]);
      if (cancelled) return;
      if (s.ok) {
        const url = s.data.blackboard?.icalUrl ?? "";
        setSavedUrl(url);
        setIcalUrl(url);
      }
      if (b.ok) {
        setEvents(b.data.events);
        setLastSync(b.data.lastSync);
      }
      setNow(Date.now());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveUrl() {
    const trimmed = icalUrl.trim();
    if (!trimmed) return;
    const res = await saveSettings({ blackboard: { icalUrl: trimmed } });
    if (res.ok) {
      setSavedUrl(trimmed);
      setEditing(false);
      toast({ title: "Feed saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  async function runSync() {
    if (syncing) return;
    const url = icalUrl.trim() || savedUrl;
    if (!url) {
      setEditing(true);
      toast({ title: "Add your Blackboard feed URL first" });
      return;
    }
    setSyncing(true);
    try {
      if (url !== savedUrl) {
        const saved = await saveSettings({ blackboard: { icalUrl: url } });
        if (!saved.ok) throw new Error(saved.error);
        setSavedUrl(url);
        setEditing(false);
      }
      const res = await syncBlackboard(url);
      setEvents(res.events);
      setLastSync(res.lastSync);
      setNow(Date.now());
      toast({
        title:
          res.added > 0
            ? `Synced ${res.added} assignment${res.added === 1 ? "" : "s"}`
            : "Already up to date",
        variant: "success",
      });
      onSynced();
    } catch (e) {
      toast({ title: "Sync failed", description: (e as Error).message, variant: "danger" });
    } finally {
      setSyncing(false);
    }
  }

  const sorted = [...events].sort((a, b) => a.dtstart - b.dtstart);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Blackboard</CardTitle>
          <CardDescription>UM Blackboard deadlines, synced from your iCal feed.</CardDescription>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void runSync()}
          disabled={syncing || loading}
        >
          <RefreshCw className={syncing ? "animate-spin motion-reduce:animate-none" : undefined} />
          Sync now
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : savedUrl && !editing ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="text-muted size-4" />
              <span className="text-muted truncate">{savedUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setEditing(true)}
              >
                Change
              </Button>
            </div>
            <p className="text-muted text-xs">
              {lastSync
                ? `Last synced ${relativeTime(lastSync, now)} · ${events.length} upcoming`
                : "Not synced yet."}
            </p>
            {sorted.length === 0 ? (
              <p className="text-muted py-2 text-sm">No upcoming assignments in this feed.</p>
            ) : (
              <div className="border-border divide-y rounded-lg border">
                {sorted.map((ev) => {
                  const score = riskScore(ev, now);
                  return (
                    <div key={ev.uid} className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">{ev.summary}</p>
                        <p className="text-muted text-xs">
                          {formatDate(ev.dtstart)} · due {relativeTime(ev.dtstart, now)}
                        </p>
                      </div>
                      <Badge variant={RISK_VARIANT[riskLabel(score)]}>{riskLabel(score)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-muted text-sm">
              Paste your Blackboard iCal feed URL (Blackboard → Calendar → Get External Link).
            </p>
            <div className="flex gap-2">
              <Input
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https://umindanao.blackboard.com/webapps/calendar/calendarFeed/…/learn.ics"
              />
              <Button variant="primary" onClick={() => void saveUrl()} disabled={!icalUrl.trim()}>
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
