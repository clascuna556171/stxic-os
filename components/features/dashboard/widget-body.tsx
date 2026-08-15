"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { CircleDollarSign, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/features/tasks/priority-badge";
import { WorldClocks } from "@/components/features/clocks/world-clocks";
import { FxConverter } from "@/components/features/fx/fx-converter";
import { currentStreak } from "@/lib/habits";
import { monthlyTotals } from "@/lib/income";
import { isOverdue } from "@/lib/tasks";
import { formatDate, startOfDay } from "@/lib/utils/dates";
import type { Currency, Habit, IncomeEntry, TaskItem } from "@/types";

const DigestCard = dynamic(
  () => import("@/components/features/dashboard/digest-card").then((m) => m.DigestCard),
  { ssr: false },
);

const IncomeChart = dynamic(
  () => import("@/components/features/income/income-chart").then((m) => m.IncomeChart),
  { ssr: false },
);

export interface DashboardData {
  tasks: TaskItem[];
  habits: Habit[];
  income: IncomeEntry[];
  focusMin: number;
  focusSessions: number;
  currency: Currency;
  now: number;
}

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2 } as const;

function todayTasks(tasks: TaskItem[], now: number): TaskItem[] {
  const tomorrow = startOfDay(now) + 86_400_000;
  return tasks
    .filter((t) => t.status !== "done" && t.dueDate != null && t.dueDate < tomorrow)
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.dueDate ?? 0) - (b.dueDate ?? 0),
    )
    .slice(0, 5);
}

export function WidgetBody({ id, data }: { id: string; data: DashboardData }) {
  switch (id) {
    case "digest":
      return <DigestCard tasks={data.tasks} habits={data.habits} focusMinutes={data.focusMin} />;
    case "tasks": {
      const list = todayTasks(data.tasks, data.now);
      return (
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Today&apos;s tasks</CardTitle>
            <Link href="/tasks" className="text-muted hover:text-foreground text-xs">
              View all
            </Link>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
            {list.length === 0 ? (
              <p className="text-muted py-2 text-sm">Nothing due today.</p>
            ) : (
              list.map((t) => (
                <Link
                  key={t.id}
                  href="/tasks"
                  className="hover:bg-surface-2/50 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <span className="text-foreground min-w-0 truncate text-sm">{t.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isOverdue(t, data.now) ? (
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
      );
    }
    case "focus":
      return (
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Focus</CardTitle>
            <Link href="/focus" className="text-muted hover:text-foreground text-xs">
              Start
            </Link>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="bg-surface-2 text-accent flex size-12 items-center justify-center rounded-full">
              <Flame className="size-6" />
            </div>
            <div>
              <p className="text-foreground font-mono text-2xl font-semibold">{data.focusMin}m</p>
              <p className="text-muted text-sm">
                {data.focusSessions} session{data.focusSessions === 1 ? "" : "s"} this week
              </p>
            </div>
          </CardContent>
        </Card>
      );
    case "clocks":
      return (
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>World clocks</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto">
            <WorldClocks />
          </CardContent>
        </Card>
      );
    case "fx":
      return (
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>FX converter</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto">
            <FxConverter />
          </CardContent>
        </Card>
      );
    case "income": {
      const monthly = monthlyTotals(data.income);
      return (
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Income</CardTitle>
            <Link href="/income" className="text-muted hover:text-foreground text-xs">
              View all
            </Link>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-auto">
            {monthly.length === 0 ? (
              <div className="flex items-center gap-3 py-2 text-sm">
                <CircleDollarSign className="text-muted size-5" />
                <p className="text-muted">Add income entries to see a chart.</p>
              </div>
            ) : (
              <IncomeChart data={monthly} currency={data.currency} />
            )}
          </CardContent>
        </Card>
      );
    }
    case "habits": {
      const top = data.habits.slice(0, 5);
      return (
        <Card className="flex h-full flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Habits</CardTitle>
            <Link href="/habits" className="text-muted hover:text-foreground text-xs">
              View all
            </Link>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
            {top.length === 0 ? (
              <p className="text-muted py-2 text-sm">No habits yet.</p>
            ) : (
              top.map((h) => {
                const streak = currentStreak(h.log, data.now);
                return (
                  <div key={h.id} className="flex items-center gap-2 py-1">
                    <span aria-hidden>{h.emoji}</span>
                    <span className="text-foreground min-w-0 truncate text-sm">{h.name}</span>
                    {streak > 0 ? (
                      <Badge variant="warning" className="ml-auto shrink-0">
                        <Flame className="size-3.5" />
                        {streak}
                      </Badge>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      );
    }
    default:
      return null;
  }
}
