"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CapsuleMetrics } from "@/components/features/dashboard/capsule-metrics";
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
        setWidgets(s.data.dashboard?.widgets?.length ? s.data.dashboard.widgets : defaultLayout());
      } else {
        setWidgets(defaultLayout());
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
  }

  function resetLayout() {
    persist(defaultLayout());
  }

  const hidden = useMemo(
    () =>
      WIDGETS.filter((w) => !widgets.some((x) => w.id === x.id)).filter(
        (w) => w.id !== "obsidianGraph" || isEnabled("obsidianLive"),
      ),
    [widgets],
  );

  const data = useMemo(
    () => ({ tasks, habits, transactions, focusMin, focusSessions, currency, now: today }),
    [tasks, habits, transactions, focusMin, focusSessions, currency, today],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Overview</h2>
          <p className="text-muted text-sm">Your encrypted workspace at a glance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hidden.length > 0 ? (
            <Select value="" onValueChange={addWidget}>
              <SelectTrigger className="w-40">
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
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetLayout}
            title="Restore default widget layout"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Reset layout</span>
          </Button>

          <p className="text-muted hidden items-center gap-1.5 text-xs lg:flex">
            Launcher
            <Kbd>⌘K</Kbd>
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Skeleton className="h-64 md:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <>
          <CapsuleMetrics
            tasks={tasks}
            habits={habits}
            focusMin={focusMin}
            focusSessions={focusSessions}
            transactions={transactions}
            currency={currency}
          />

          <DashboardGrid
            widgets={
              isEnabled("obsidianLive") ? widgets : widgets.filter((w) => w.id !== "obsidianGraph")
            }
            onChange={changeLayout}
            onHide={hideWidget}
            renderWidget={(id) => <WidgetBody id={id} data={data} />}
          />
        </>
      )}
    </div>
  );
}
