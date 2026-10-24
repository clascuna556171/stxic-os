"use client";

import Link from "next/link";
import { CheckCircle2, CircleDollarSign, Flame, Timer } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
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
  const habitsStreaking = habits.filter((h) => h.streak > 0).length;
  const netFlow = transactions.reduce(
    (acc, tx) => acc + (tx.type === "income" ? tx.amount : -tx.amount),
    0,
  );

  const items = [
    {
      id: "tasks",
      href: "/tasks",
      label: "Open Tasks",
      value: String(openTasks),
      meta: `${completedTasks} completed`,
      icon: CheckCircle2,
    },
    {
      id: "focus",
      href: "/focus",
      label: "Weekly Focus",
      value: `${Math.round(focusMin)}m`,
      meta: `${focusSessions} session${focusSessions === 1 ? "" : "s"}`,
      icon: Timer,
    },
    {
      id: "habits",
      href: "/habits",
      label: "Habit Streaks",
      value: `${habitsStreaking}/${habits.length}`,
      meta: habitsStreaking > 0 ? "Active momentum" : "No active streak",
      icon: Flame,
    },
    {
      id: "finance",
      href: "/income",
      label: "Net Cashflow",
      value: formatCurrency(netFlow, currency, true),
      meta: `${transactions.length} ledger entr${transactions.length === 1 ? "y" : "ies"}`,
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="border-border bg-surface hover:bg-surface-2/60 group flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-xs font-medium">{item.label}</span>
            <item.icon className="text-muted group-hover:text-accent size-4 transition-colors" />
          </div>
          <div>
            <p className="text-foreground font-mono text-xl font-semibold tracking-tight">
              {item.value}
            </p>
            <p className="text-muted mt-0.5 truncate text-xs">{item.meta}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
