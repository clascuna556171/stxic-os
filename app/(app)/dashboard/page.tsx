"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutDashboard, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeroAnalytics } from "@/components/features/dashboard/hero-analytics";
import { CapsuleMetrics } from "@/components/features/dashboard/capsule-metrics";
import { QuickMomentum } from "@/components/features/dashboard/quick-momentum";
import { ScheduleTimeline } from "@/components/features/dashboard/schedule-timeline";
import { DashboardGrid } from "@/components/features/dashboard/grid";
import { WidgetBody } from "@/components/features/dashboard/widget-body";
import { WIDGETS, defaultLayout } from "@/lib/dashboard/widgets";
import { isEnabled } from "@/lib/config/features";
import {
  getSettings,
  listFocusSessions,
  listHabits,
  listTasks,
  listTransactions,
  saveSettings,
} from "@/lib/hydrate";
import { weeklyFocusStat } from "@/lib/focus";
import type { Currency, DashboardWidget, Habit, TaskItem, Transaction } from "@/types";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [today, setToday] = useState(0);
  const [focusMin, setFocusMin] = useState(0);
  const [focusSessions, setFocusSessions] = useState(0);
  const [currency, setCurrency] = useState<Currency>("PHP");
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModularWidgets, setShowModularWidgets] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [t, f, i, s, h] = await Promise.all([
        listTasks(),
        listFocusSessions(),
        listTransactions(),
        getSettings(),
        listHabits(),
      ]);
      if (cancelled) return;
      if (t.ok) setTasks(t.data);
      if (f.ok) {
        const stat = weeklyFocusStat(f.data);
        setFocusMin(stat.totalMinutes);
        setFocusSessions(stat.sessions);
      }
      if (i.ok) setTransactions(i.data);
      if (s.ok) {
        setCurrency(s.data.defaultCurrency);
        const savedWidgets = s.data.dashboard?.widgets;
        if (savedWidgets && savedWidgets.length > 0) {
          setWidgets(savedWidgets);
          setShowModularWidgets(true);
        } else {
          setWidgets(defaultLayout());
        }
      }
      if (h.ok) setHabits(h.data);
      setToday(Date.now());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function changeLayout(next: DashboardWidget[]) {
    setWidgets(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveSettings({ dashboard: { widgets: next } });
    }, 600);
  }

  function persist(next: DashboardWidget[]) {
    setWidgets(next);
    void saveSettings({ dashboard: { widgets: next } });
  }

  function hideWidget(id: string) {
    persist(widgets.filter((w) => w.id !== id));
  }

  function addWidget(id: string) {
    if (widgets.some((w) => w.id === id)) return;
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    const next = [...widgets, { id, x: 0, y: maxY, w: 6, h: 3 }];
    persist(next);
    setShowModularWidgets(true);
  }

  const hidden = useMemo(
    () =>
      WIDGETS.filter((w) => !widgets.some((x) => x.id === w.id)).filter(
        (w) => w.id !== "obsidianGraph" || isEnabled("obsidianLive"),
      ),
    [widgets],
  );

  const data = useMemo(
    () => ({ tasks, habits, transactions, focusMin, focusSessions, currency, now: today }),
    [tasks, habits, transactions, focusMin, focusSessions, currency, today],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 flex flex-col gap-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="xl:col-span-4">
          <Skeleton className="h-[580px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Top Controls & Category Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-foreground text-2xl font-bold tracking-tight">Stats & Overview</h2>
          <p className="text-muted text-xs uppercase tracking-wider font-medium mt-0.5">
            Real-time telemetry and workspace activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowModularWidgets((prev) => !prev)}
            className={`border rounded-xl px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 transition-all shadow-2xs ${
              showModularWidgets
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-surface hover:bg-surface-2 text-muted border-border/80"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>{showModularWidgets ? "Hide Custom Grid" : "Custom Widgets"}</span>
          </button>

          <Select value="" onValueChange={addWidget} disabled={hidden.length === 0}>
            <SelectTrigger className="w-38 h-8.5 rounded-xl text-xs">
              <SelectValue placeholder="Add widget…" />
            </SelectTrigger>
            <SelectContent>
              {hidden.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Primary Dashboard Grid (Sample 1 Layout) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols (Hero Chart + 4 Stacked Metric Capsules + Momentum Wave) */}
        <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-6">
          {/* Hero Bubble & Velocity Chart */}
          <HeroAnalytics
            tasks={tasks}
            transactions={transactions}
            focusMinutes={focusMin}
            currency={currency}
          />

          {/* 4 Stacked Capsule Metric Cards with Layer Depth */}
          <CapsuleMetrics tasks={tasks} habits={habits} focusMin={focusMin} />

          {/* Bottom Quick Chips & Wave Sparkline */}
          <QuickMomentum
            tasksCount={tasks.length}
            habitsCount={habits.length}
            focusMinutes={focusMin}
            transactionsCount={transactions.length}
          />
        </div>

        {/* Right 4 Cols (Schedule & Activity Timeline Rail) */}
        <div className="xl:col-span-4 2xl:col-span-3">
          <ScheduleTimeline tasks={tasks} />
        </div>
      </div>

      {/* Modular Custom Grid Drawer (World clocks, Obsidian Graph, FX, Finance etc.) */}
      {showModularWidgets ? (
        <div className="border-border/80 bg-surface/40 flex flex-col gap-4 rounded-2xl border p-6 mt-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-foreground text-sm font-semibold flex items-center gap-2">
                <LayoutDashboard className="size-4 text-accent" />
                Custom Modular Grid
              </h3>
              <p className="text-muted text-xs">
                Drag and arrange your personal widgets (World clocks, FX converter, Obsidian vault).
              </p>
            </div>
          </div>

          <DashboardGrid
            widgets={
              isEnabled("obsidianLive") ? widgets : widgets.filter((w) => w.id !== "obsidianGraph")
            }
            onChange={changeLayout}
            onHide={hideWidget}
            renderWidget={(id) => <WidgetBody id={id} data={data} />}
          />
        </div>
      ) : null}
    </div>
  );
}
