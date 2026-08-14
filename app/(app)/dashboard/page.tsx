"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Kbd } from "@/components/ui/kbd";
import { PriorityBadge } from "@/components/features/tasks/priority-badge";
import { WorldClocks } from "@/components/features/clocks/world-clocks";
import { FxConverter } from "@/components/features/fx/fx-converter";
import { getSettings, listFocusSessions, listIncome, listTasks } from "@/lib/hydrate";
import { weeklyFocusStat } from "@/lib/focus";
import { monthlyTotals } from "@/lib/income";
import { isOverdue } from "@/lib/tasks";
import { formatDate, startOfDay } from "@/lib/utils/dates";
import type { Currency, IncomeEntry, TaskItem } from "@/types";

const IncomeChart = dynamic(
  () => import("@/components/features/income/income-chart").then((m) => m.IncomeChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2 } as const;

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [today, setToday] = useState(0);
  const [focusMin, setFocusMin] = useState(0);
  const [focusSessions, setFocusSessions] = useState(0);
  const [currency, setCurrency] = useState<Currency>("PHP");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [t, f, i, s] = await Promise.all([
        listTasks(),
        listFocusSessions(),
        listIncome(),
        getSettings(),
      ]);
      if (cancelled) return;
      if (t.ok) setTasks(t.data);
      if (f.ok) {
        const stat = weeklyFocusStat(f.data);
        setFocusMin(stat.totalMinutes);
        setFocusSessions(stat.sessions);
      }
      if (i.ok) setIncome(i.data);
      if (s.ok) setCurrency(s.data.defaultCurrency);
      setToday(Date.now());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayTasks = useMemo(() => {
    const tomorrow = startOfDay(today) + 86_400_000;
    return tasks
      .filter((t) => t.status !== "done" && t.dueDate != null && t.dueDate < tomorrow)
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          (a.dueDate ?? 0) - (b.dueDate ?? 0),
      )
      .slice(0, 5);
  }, [tasks, today]);

  const monthly = useMemo(() => monthlyTotals(income), [income]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Welcome back</h2>
          <p className="text-muted text-sm">Your private life OS, at a glance.</p>
        </div>
        <p className="text-muted flex items-center gap-1.5 text-xs">
          Quick launcher
          <Kbd>⌘K</Kbd>
        </p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Today&apos;s tasks</CardTitle>
                <Link
                  href="/tasks"
                  className="text-muted hover:text-foreground text-xs transition-colors"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {todayTasks.length === 0 ? (
                  <p className="text-muted py-4 text-sm">Nothing due today. Nice and clear.</p>
                ) : (
                  todayTasks.map((t) => (
                    <Link
                      key={t.id}
                      href="/tasks"
                      className="hover:bg-surface-2/50 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <span className="text-foreground min-w-0 truncate text-sm">{t.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {isOverdue(t, today) ? (
                          <span className="text-danger text-xs">Overdue</span>
                        ) : (
                          <span className="text-muted text-xs">{formatDate(t.dueDate!)}</span>
                        )}
                        <PriorityBadge priority={t.priority} />
                      </span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Focus</CardTitle>
                <Link
                  href="/focus"
                  className="text-muted hover:text-foreground text-xs transition-colors"
                >
                  Start
                </Link>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="bg-surface-2 text-accent flex size-12 items-center justify-center rounded-full">
                  <Flame className="size-6" />
                </div>
                <div>
                  <p className="text-foreground font-mono text-2xl font-semibold">{focusMin}m</p>
                  <p className="text-muted text-sm">
                    {focusSessions} session{focusSessions === 1 ? "" : "s"} this week
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>World clocks</CardTitle>
              </CardHeader>
              <CardContent>
                <WorldClocks />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>FX converter</CardTitle>
              </CardHeader>
              <CardContent>
                <FxConverter />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Income</CardTitle>
              <Link
                href="/income"
                className="text-muted hover:text-foreground text-xs transition-colors"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {monthly.length === 0 ? (
                <div className="flex items-center gap-3 py-4 text-sm">
                  <CircleDollarSign className="text-muted size-5" />
                  <p className="text-muted">Add income entries to see a monthly chart here.</p>
                </div>
              ) : (
                <IncomeChart data={monthly} currency={currency} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
