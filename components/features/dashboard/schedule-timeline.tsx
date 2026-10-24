"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import type { TaskItem } from "@/types";
import { openCommandPalette } from "@/components/command/command-palette";

interface ScheduleTimelineProps {
  tasks: TaskItem[];
}

export function ScheduleTimeline({ tasks }: ScheduleTimelineProps) {
  const [dayOffset, setDayOffset] = useState(0);

  // Dynamic date calculation with navigation
  const displayedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const prefix =
      dayOffset === 0 ? "Today, " : dayOffset === -1 ? "Yesterday, " : dayOffset === 1 ? "Tomorrow, " : "";
    const dateFormatted = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return `${prefix}${dateFormatted}`;
  }, [dayOffset]);

  // Dynamic current time string (e.g. "9:30 am" or actual time)
  const currentTimeStr = useMemo(() => {
    const now = new Date();
    return now
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase();
  }, []);

  const events = useMemo(() => {
    const primaryTask = tasks[0]?.title ?? "Review Architecture & Vault";
    const secondaryTask = tasks[1]?.title ?? "AI Daily Briefing & Digest";
    const tertiaryTask = tasks[2]?.title ?? "Habits & Focus Reflection";

    return [
      {
        id: "ev-1",
        time: "08:30 – 09:00",
        slot: "08:00 am",
        title: "Session Key & Crypto Check",
        subtitle: "Zero-knowledge verification",
        icon: Zap,
        color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        active: false,
      },
      {
        id: "ev-2",
        time: "09:30 – 10:15",
        slot: "10:00 am",
        title: primaryTask,
        subtitle: "Active workspace priority",
        icon: Timer,
        color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
        active: true,
      },
      {
        id: "ev-3",
        time: "11:00 – 11:45",
        slot: "11:00 am",
        title: secondaryTask,
        subtitle: "Automated synthesis",
        icon: Sparkles,
        color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        active: false,
      },
      {
        id: "ev-4",
        time: "01:30 – 02:15",
        slot: "01:00 pm",
        title: tertiaryTask,
        subtitle: "Daily streak maintenance",
        icon: Check,
        color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        active: false,
      },
    ];
  }, [tasks]);

  return (
    <div className="relative border-border/80 bg-surface/90 shadow-md dark:shadow-xl dark:shadow-black/25 flex flex-col justify-between rounded-2xl border p-5 transition-all h-full">
      {/* Header: Date Navigator & Notifications */}
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-4 mb-5">
          <div className="flex items-center gap-1.5">
            <span className="bg-accent/20 text-accent size-7 rounded-lg flex items-center justify-center">
              <Calendar className="size-4" />
            </span>
          </div>

          <div className="border-border bg-surface-2/60 text-foreground flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <button
              type="button"
              className="text-muted hover:text-foreground p-0.5 transition-colors"
              onClick={() => setDayOffset((prev) => prev - 1)}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="font-semibold select-none">{displayedDate}</span>
            <button
              type="button"
              className="text-muted hover:text-foreground p-0.5 transition-colors"
              onClick={() => setDayOffset((prev) => prev + 1)}
              aria-label="Next day"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            className="border-border hover:bg-surface-2 text-muted hover:text-foreground flex size-7 items-center justify-center rounded-lg border transition-colors"
            aria-label="Notifications"
          >
            <Bell className="size-3.5" />
          </button>
        </div>

        {/* Timeline Axis & Event Items */}
        <div className="relative flex flex-col gap-5 pl-2 pr-1">
          {/* Vertical guideline */}
          <div className="absolute left-[3.75rem] top-2 bottom-4 w-px bg-border/60 pointer-events-none" />

          {events.map((ev, index) => {
            const Icon = ev.icon;
            return (
              <div key={ev.id} className="flex flex-col gap-5">
                {/* Real-time Indicator Pill (Sample 1 Style) */}
                {index === 1 && dayOffset === 0 ? (
                  <div className="relative flex items-center gap-4 my-0.5">
                    <span className="text-muted text-[11px] font-mono w-12 shrink-0">Now</span>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="bg-accent text-accent-fg font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-md shadow-accent/20">
                        {currentTimeStr}
                      </div>
                      <div className="h-px bg-accent/60 flex-1" />
                    </div>
                  </div>
                ) : null}

                <div className="relative flex items-start gap-4">
                  <span className="text-muted text-[11px] font-mono w-12 pt-2 shrink-0">
                    {ev.slot}
                  </span>
                  <div
                    className={`flex-1 rounded-xl border p-3 transition-colors ${
                      ev.active && dayOffset === 0
                        ? "border-accent/40 bg-surface-2/90 ring-1 ring-accent/20 shadow-xs"
                        : "border-border/80 bg-surface-2/70 hover:bg-surface-2 shadow-2xs"
                    } flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-8 rounded-full border flex items-center justify-center shrink-0 ${ev.color}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground text-xs font-semibold truncate">{ev.title}</p>
                        <p
                          className={`text-[10px] truncate ${
                            ev.active && dayOffset === 0 ? "text-accent font-medium" : "text-muted"
                          }`}
                        >
                          {ev.time}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-muted hover:text-foreground p-1"
                      aria-label="Options"
                    >
                      <MoreVertical className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button (FAB - Sample 1 bottom-right) */}
      <div className="flex justify-end pt-6">
        <button
          type="button"
          onClick={openCommandPalette}
          className="bg-accent text-accent-fg hover:bg-accent-hover size-12 rounded-full shadow-lg shadow-accent/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="Create new entry or trigger quick action"
          title="Quick Action (⌘K)"
        >
          <Plus className="size-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
