"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleDollarSign, Flame, Timer } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { Currency, Habit, TaskItem, Transaction } from "@/types";

interface CapsuleMetricsProps {
  tasks: TaskItem[];
  habits: Habit[];
  focusMin: number;
  focusSessions?: number;
  transactions?: Transaction[];
  currency?: Currency;
}

export function CapsuleMetrics({
  tasks,
  habits,
  focusMin,
  focusSessions = 0,
  transactions = [],
  currency = "PHP",
}: CapsuleMetricsProps) {
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const openTasks = tasks.length - completedTasks;
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const habitsStreaking = habits.filter((h) => h.streak > 0).length;
  const netFlow = transactions.reduce(
    (acc, tx) => acc + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );

  const items = [
    {
      id: "tasks",
      href: "/tasks",
      label: "Active Tasks",
      value: String(openTasks),
      badge: `${completionRate}% done`,
      badgePositive: completionRate >= 50,
      meta: `${completedTasks} of ${tasks.length} completed`,
      icon: CheckCircle2,
    },
    {
      id: "focus",
      href: "/focus",
      label: "Weekly Focus",
      value: `${Math.round(focusMin)}m`,
      badge: `${focusSessions} sess`,
      badgePositive: focusMin > 0,
      meta: focusSessions > 0 ? "Deep work logged this week" : "Start a Pomodoro session",
      icon: Timer,
    },
    {
      id: "habits",
      href: "/habits",
      label: "Habit Momentum",
      value: `${habitsStreaking}/${habits.length}`,
      badge: habitsStreaking > 0 ? "Active" : "Idle",
      badgePositive: habitsStreaking > 0,
      meta: habitsStreaking > 0 ? "Streaks alive today" : "Check in on daily habits",
      icon: Flame,
    },
    {
      id: "finance",
      href: "/income",
      label: "Net Cashflow",
      value: formatCurrency(netFlow, currency, true),
      badge: netFlow >= 0 ? "Surplus" : "Deficit",
      badgePositive: netFlow >= 0,
      meta: `${transactions.length} ledger entr${transactions.length === 1 ? "y" : "ies"}`,
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="border-border bg-surface hover:border-accent/40 hover:bg-surface-2/50 group relative flex flex-col justify-between gap-3.5 overflow-hidden rounded-2xl border p-4 transition-all"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="bg-surface-2 text-accent flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/5">
              <item.icon className="size-4" />
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                item.badgePositive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-surface-2 text-muted",
              )}
            >
              {item.badge}
              <ArrowUpRight className="size-2.5" />
            </span>
          </div>
          <div>
            <p className="text-muted text-xs font-medium">{item.label}</p>
            <p className="text-foreground mt-0.5 font-mono text-2xl font-bold tracking-tight">
              {item.value}
            </p>
            <p className="text-muted mt-1 truncate text-[11px]">{item.meta}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
