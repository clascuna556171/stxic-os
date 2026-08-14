"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings, saveSettings } from "@/lib/hydrate";
import {
  AVAILABLE_ZONES,
  DEFAULT_CLOCKS,
  formatOffset,
  timeZoneLabel,
  timeZoneOffsetMinutes,
} from "@/lib/clocks";
import { cn } from "@/lib/utils/cn";

const BOOT_TIME = Date.now();

function ClockCard({ zone, onRemove }: { zone: string; onRemove: () => void }) {
  const [now, setNow] = useState(BOOT_TIME);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = new Date(now);
  const time = date.toLocaleTimeString(undefined, {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const day = date.toLocaleDateString(undefined, {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const offset = formatOffset(timeZoneOffsetMinutes(zone, date));

  return (
    <div className="border-border bg-surface hover:bg-surface-2/50 group relative flex flex-col gap-1 rounded-xl border p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${timeZoneLabel(zone)}`}
        className="text-muted hover:text-danger absolute top-2 right-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="size-3.5" />
      </button>
      <p className="text-muted text-xs">
        {timeZoneLabel(zone)} <span className="font-mono">({offset})</span>
      </p>
      <p className="text-foreground font-mono text-xl font-semibold tabular-nums">{time}</p>
      <p className="text-muted text-xs">{day}</p>
    </div>
  );
}

export function WorldClocks() {
  const [zones, setZones] = useState<string[]>(DEFAULT_CLOCKS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getSettings();
      if (cancelled) return;
      if (res.ok && res.data.clocks && res.data.clocks.length > 0) setZones(res.data.clocks);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function add(zone: string) {
    if (!zone || zones.includes(zone)) return;
    const next = [...zones, zone];
    setZones(next);
    void saveSettings({ clocks: next });
  }

  function remove(zone: string) {
    const next = zones.filter((z) => z !== zone);
    setZones(next);
    void saveSettings({ clocks: next });
  }

  const options = AVAILABLE_ZONES.filter((z) => !zones.includes(z));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loaded
          ? zones.map((z) => <ClockCard key={z} zone={z} onRemove={() => remove(z)} />)
          : null}
      </div>

      <Select value="" onValueChange={add} disabled={options.length === 0}>
        <SelectTrigger className={cn("w-full", options.length === 0 && "opacity-50")}>
          <SelectValue placeholder="Add a clock…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((z) => (
            <SelectItem key={z} value={z}>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {timeZoneLabel(z)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {options.length === 0 ? (
        <p className="text-muted flex items-center gap-1.5 text-xs">
          <Plus className="size-3.5" /> All clocks added
        </p>
      ) : null}
    </div>
  );
}
