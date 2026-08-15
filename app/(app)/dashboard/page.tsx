"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardGrid } from "@/components/features/dashboard/grid";
import { WidgetBody } from "@/components/features/dashboard/widget-body";
import { WIDGETS, defaultLayout } from "@/lib/dashboard/widgets";
import {
  getSettings,
  listFocusSessions,
  listHabits,
  listIncome,
  listTasks,
  saveSettings,
} from "@/lib/hydrate";
import { weeklyFocusStat } from "@/lib/focus";
import type { Currency, DashboardWidget, Habit, IncomeEntry, TaskItem } from "@/types";

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
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
        listIncome(),
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
      if (i.ok) setIncome(i.data);
      if (s.ok) {
        setCurrency(s.data.defaultCurrency);
        setWidgets(s.data.dashboard?.widgets?.length ? s.data.dashboard.widgets : defaultLayout());
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

  const hidden = useMemo(
    () => WIDGETS.filter((w) => !widgets.some((x) => x.id === w.id)),
    [widgets],
  );

  const data = useMemo(
    () => ({ tasks, habits, income, focusMin, focusSessions, currency, now: today }),
    [tasks, habits, income, focusMin, focusSessions, currency, today],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Welcome back</h2>
          <p className="text-muted text-sm">Your private life OS, at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value="" onValueChange={addWidget} disabled={hidden.length === 0}>
            <SelectTrigger className="w-44">
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
          <p className="text-muted flex items-center gap-1.5 text-xs">
            Quick launcher
            <Kbd>⌘K</Kbd>
          </p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          onChange={changeLayout}
          onHide={hideWidget}
          renderWidget={(id) => <WidgetBody id={id} data={data} />}
        />
      )}
    </div>
  );
}
