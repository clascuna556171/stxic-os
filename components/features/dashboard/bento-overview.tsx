"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  TrendingUp,
  Wallet,
  Wifi,
} from "lucide-react";
import { AccountDialog } from "@/components/features/income/account-dialog";
import { netByMonth, startOfWeekFocusDays } from "@/components/features/dashboard/bento-helpers";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type {
  Currency,
  FinanceAccount,
  FocusSession,
  Habit,
  SavingsGoal,
  TaskItem,
  Transaction,
} from "@/types";

interface BentoOverviewProps {
  accounts: FinanceAccount[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  tasks: TaskItem[];
  habits: Habit[];
  focusSessions: FocusSession[];
  currency: Currency;
  holderName: string;
  onAddAccount: (account: FinanceAccount) => Promise<void>;
}

const PAYMENT_GLOWS = [
  "from-emerald-500/20 via-emerald-500/5 to-transparent",
  "from-amber-500/20 via-rose-500/5 to-transparent",
  "from-sky-500/20 via-indigo-500/5 to-transparent",
] as const;

export function BentoOverview({
  accounts,
  transactions,
  savingsGoals,
  tasks,
  habits,
  focusSessions,
  currency,
  holderName,
  onAddAccount,
}: BentoOverviewProps) {
  const [selectedCardIdx, setSelectedCardIdx] = useState(0);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [activeMonthIdx, setActiveMonthIdx] = useState<number | null>(null);

  const activeAccount = accounts[selectedCardIdx] ?? accounts[0];

  // Financial aggregates (matching user's active currency or all entries)
  const totalAccountBalance = useMemo(() => {
    if (accounts.length === 0) {
      return transactions.reduce(
        (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
        0,
      );
    }
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  }, [accounts, transactions]);

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const totalExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

  const { totalSaved, savingsPercent } = useMemo(() => {
    const saved = savingsGoals.reduce((sum, g) => sum + g.saved, 0);
    const target = savingsGoals.reduce((sum, g) => sum + g.target, 0);
    const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    return { totalSaved: saved, savingsPercent: pct };
  }, [savingsGoals]);

  // Top 3 recent transactions for "Recent Payments"
  const recentPayments = useMemo(
    () =>
      transactions
        .slice()
        .sort((a, b) => b.date - a.date)
        .slice(0, 3),
    [transactions],
  );

  // Analytics 6-month dual bar series
  const analyticsSeries = useMemo(() => netByMonth(transactions, 6), [transactions]);
  const maxAnalyticsVal = useMemo(
    () =>
      Math.max(
        1000,
        ...analyticsSeries.map((m) => Math.max(m.income, m.expense)),
      ),
    [analyticsSeries],
  );
  const highlightedMonth =
    analyticsSeries[activeMonthIdx ?? analyticsSeries.length - 1] ?? analyticsSeries[0];

  // Weekly Performance 7-day bars (Mon–Sun)
  const weeklyDays = useMemo(
    () => startOfWeekFocusDays(focusSessions, tasks, habits),
    [focusSessions, tasks, habits],
  );
  const maxDayScore = useMemo(
    () => Math.max(25, ...weeklyDays.map((d) => d.score)),
    [weeklyDays],
  );
  const peakDayIdx = useMemo(() => {
    let bestIdx = weeklyDays.findIndex((d) => d.isToday);
    let bestScore = -1;
    weeklyDays.forEach((d, idx) => {
      if (d.score > bestScore) {
        bestScore = d.score;
        bestIdx = idx;
      }
    });
    return bestIdx >= 0 ? bestIdx : 0;
  }, [weeklyDays]);

  // Completion Overview Donut segments
  const donutStats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const activeHabits = habits.filter((h) => h.streak > 0).length;
    const total = done + inProgress + todo + activeHabits;
    const safeTotal = Math.max(1, total);
    const circumference = 2 * Math.PI * 46;

    const rawSegments = [
      {
        id: "done",
        label: "Completed Tasks",
        count: done,
        pct: Math.round((done / safeTotal) * 100),
        color: "var(--accent)",
      },
      {
        id: "in_progress",
        label: "In Progress",
        count: inProgress,
        pct: Math.round((inProgress / safeTotal) * 100),
        color: "#38bdf8",
      },
      {
        id: "todo",
        label: "Open Tasks",
        count: todo,
        pct: Math.round((todo / safeTotal) * 100),
        color: "#a855f7",
      },
      {
        id: "habits",
        label: "Active Habits",
        count: activeHabits,
        pct: Math.round((activeHabits / safeTotal) * 100),
        color: "#3ddc84",
      },
    ];

    let runningOffset = 0;
    const segments = rawSegments.map((seg) => {
      const length = seg.count > 0 ? (seg.count / safeTotal) * circumference : 0;
      const dashArray = `${Math.max(2, length - 4)} ${circumference}`;
      const dashOffset = -runningOffset;
      runningOffset += length;
      return { ...seg, dashArray, dashOffset };
    });

    return { total, segments };
  }, [tasks, habits]);

  return (
    <div className="flex flex-col gap-5">
      {/* ── ROW 1: My Cards + Recent Payments (from ref1.png) ──────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: My Cards */}
        <section className="border-border bg-surface flex flex-col justify-between gap-4 rounded-2xl border p-5 xl:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-tight">My Cards</h3>
              <p className="text-muted text-xs">
                {accounts.length > 0
                  ? `${accounts.length} tracked account${accounts.length === 1 ? "" : "s"}`
                  : "Primary encrypted wallet"}
              </p>
            </div>
            {accounts.length > 1 ? (
              <div className="flex items-center gap-1">
                {accounts.slice(0, 4).map((acc, idx) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedCardIdx(idx)}
                    className={cn(
                      "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                      selectedCardIdx === idx
                        ? "bg-accent text-accent-fg font-semibold"
                        : "bg-surface-2 text-muted hover:text-foreground",
                    )}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            ) : (
              <Link
                href="/income"
                className="text-muted hover:text-accent text-xs font-medium transition-colors"
              >
                Manage →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_118px]">
            {/* Visual Stacked Bank/Wallet Card */}
            <div className="relative pt-2">
              {/* Top stacked card edge for depth */}
              <div
                className="pointer-events-none absolute inset-x-3 top-0 h-5 rounded-t-2xl border border-white/10 bg-gradient-to-r from-indigo-500/35 via-fuchsia-500/30 to-amber-400/35"
                aria-hidden
              />
              <div className="relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#231d3c] via-[#171d2b] to-[#2b231d] p-4 text-white shadow-lg">
                {/* Ambient mesh highlight */}
                <div
                  className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full opacity-30 blur-2xl"
                  style={{ background: "var(--accent)" }}
                  aria-hidden
                />

                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-white/80" />
                    <span className="text-xs font-semibold tracking-wide text-white/90">
                      {activeAccount?.name ?? "Stxic Vault Card"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/85">
                      {activeAccount?.kind ?? "multi"}
                    </span>
                    <Wifi className="size-3.5 rotate-90 text-white/70" aria-hidden />
                  </div>
                </div>

                <div className="relative my-2">
                  <p className="font-mono text-sm font-semibold tracking-[0.18em] text-white/95 sm:text-base">
                    3455 4562 7710 {activeAccount?.last4 || "4829"}
                  </p>
                </div>

                <div className="relative flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">
                      {holderName}
                    </p>
                    <p className="font-mono text-lg font-bold tracking-tight text-white">
                      {formatCurrency(
                        activeAccount ? activeAccount.balance : totalAccountBalance,
                        activeAccount?.currency ?? currency,
                      )}
                    </p>
                  </div>

                  {/* Overlapping card brand circles */}
                  <div className="flex items-center" aria-hidden>
                    <span className="size-6 rounded-full bg-rose-500/85" />
                    <span className="-ml-2.5 size-6 rounded-full bg-amber-400/85" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dashed "+ Add New Card" Tile */}
            <button
              type="button"
              onClick={() => setAccountDialogOpen(true)}
              className="border-border hover:border-accent/60 bg-surface-2/30 hover:bg-surface-2/60 group flex min-h-[164px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed p-3 text-center transition-all cursor-pointer"
            >
              <span className="bg-accent text-accent-fg flex size-9 items-center justify-center rounded-full shadow-[0_0_16px_-3px_var(--accent)] transition-transform group-hover:scale-105">
                <Plus className="size-4" />
              </span>
              <span className="text-muted group-hover:text-foreground text-xs font-medium leading-tight">
                Add New Card
              </span>
            </button>
          </div>
        </section>

        {/* Right: Recent Payments */}
        <section className="border-border bg-surface flex flex-col justify-between gap-4 rounded-2xl border p-5 xl:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-tight">
                Recent Payments
              </h3>
              <p className="text-muted text-xs">Latest encrypted ledger activity</p>
            </div>
            <Link
              href="/income"
              className="text-muted hover:text-accent text-xs font-medium transition-colors"
            >
              See All →
            </Link>
          </div>

          {recentPayments.length === 0 ? (
            <div className="border-border bg-surface-2/30 flex min-h-[164px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center">
              <Receipt className="text-muted size-5" />
              <p className="text-foreground text-xs font-medium">No transactions recorded yet</p>
              <Link href="/income" className="text-accent text-xs font-medium hover:underline">
                Record your first income or expense →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {recentPayments.map((tx, idx) => {
                const isIncome = tx.type === "income";
                const dateLabel = new Date(tx.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
                const glowCls = PAYMENT_GLOWS[idx % PAYMENT_GLOWS.length];
                return (
                  <Link
                    key={tx.id}
                    href="/income"
                    className="border-border bg-surface-2/40 hover:border-accent/40 group relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all"
                  >
                    {/* Bottom diagonal glow matching ref1.png */}
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t opacity-90",
                        glowCls,
                      )}
                      aria-hidden
                    />

                    <div className="relative flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10",
                          isIncome
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-300",
                        )}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="size-4" />
                        ) : (
                          <Landmark className="size-4" />
                        )}
                      </div>
                      <span className="text-muted font-mono text-[11px]">{dateLabel}</span>
                    </div>

                    <div className="relative my-2">
                      <p className="text-foreground truncate text-sm font-semibold">{tx.label}</p>
                      <p className="text-muted truncate text-[11px]">{tx.category}</p>
                    </div>

                    <div className="relative flex items-center justify-between gap-2 pt-1">
                      <span className="text-foreground font-mono text-sm font-bold">
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount, tx.currency, true)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                          isIncome
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400",
                        )}
                      >
                        {isIncome ? "Received" : "Paid"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── ROW 2: 2×2 Financial Bento + Analytics Chart (from ref1.png) ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: 2×2 Metric Cards (Balance Hero Accent + Income + Savings + Expenses) */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:col-span-5">
          {/* 1. Balance — Hero Accent Card */}
          <Link
            href="/income"
            className="bg-accent text-accent-fg group flex min-h-[136px] flex-col justify-between rounded-2xl p-4 shadow-[0_12px_32px_-12px_var(--accent)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black/15">
                <Wallet className="size-4" />
              </div>
              <span className="text-xs font-bold tracking-tight">Balance</span>
            </div>
            <div className="flex items-end justify-between gap-2 pt-3">
              <p className="font-mono text-xl font-bold tracking-tight">
                {formatCurrency(totalAccountBalance, currency, true)}
              </p>
              <span className="rounded-full bg-black/15 px-2 py-0.5 font-mono text-[10px] font-semibold">
                {accounts.length > 0 ? `${accounts.length} cards` : "Active"}
              </span>
            </div>
          </Link>

          {/* 2. Income */}
          <Link
            href="/income"
            className="border-border bg-surface hover:border-accent/40 flex min-h-[136px] flex-col justify-between rounded-2xl border p-4 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-surface-2 text-accent flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/5">
                <TrendingUp className="size-4" />
              </div>
              <span className="text-foreground text-xs font-semibold">Income</span>
            </div>
            <div className="flex items-end justify-between gap-2 pt-3">
              <p className="text-foreground font-mono text-xl font-bold tracking-tight">
                {formatCurrency(totalIncome, currency, true)}
              </p>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                +Inflow
              </span>
            </div>
          </Link>

          {/* 3. Savings */}
          <Link
            href="/income"
            className="border-border bg-surface hover:border-accent/40 flex min-h-[136px] flex-col justify-between rounded-2xl border p-4 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-surface-2 text-accent flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/5">
                <PiggyBank className="size-4" />
              </div>
              <span className="text-foreground text-xs font-semibold">Savings</span>
            </div>
            <div className="flex items-end justify-between gap-2 pt-3">
              <p className="text-foreground font-mono text-xl font-bold tracking-tight">
                {formatCurrency(totalSaved, currency, true)}
              </p>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                {savingsPercent}% goal
              </span>
            </div>
          </Link>

          {/* 4. Expenses */}
          <Link
            href="/income"
            className="border-border bg-surface hover:border-accent/40 flex min-h-[136px] flex-col justify-between rounded-2xl border p-4 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-surface-2 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/5 text-rose-400">
                <ArrowUpRight className="size-4" />
              </div>
              <span className="text-foreground text-xs font-semibold">Expenses</span>
            </div>
            <div className="flex items-end justify-between gap-2 pt-3">
              <p className="text-foreground font-mono text-xl font-bold tracking-tight">
                {formatCurrency(totalExpense, currency, true)}
              </p>
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-400">
                Outflow
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Analytics Dual-Bar Chart (Income vs Outcome) */}
        <section className="border-border bg-surface flex flex-col justify-between gap-4 rounded-2xl border p-5 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-tight">Analytics</h3>
              <p className="text-muted text-xs">Monthly cashflow comparison</p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="bg-accent size-2.5 rounded-full" aria-hidden />
                <span className="text-muted">Income</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-2.5 rounded-full bg-emerald-500/45" aria-hidden />
                <span className="text-muted">Outcome</span>
              </span>
              {highlightedMonth ? (
                <span className="border-border bg-surface-2 text-foreground rounded-lg border px-2.5 py-1 font-mono text-[11px]">
                  {highlightedMonth.label}:{" "}
                  <strong className="text-accent">
                    {formatCurrency(highlightedMonth.income, currency, true)}
                  </strong>{" "}
                  / {formatCurrency(highlightedMonth.expense, currency, true)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative mt-1 flex h-48 items-end gap-3 pt-6">
            {/* Subtle horizontal reference lines */}
            <div
              className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6"
              aria-hidden
            >
              {[100, 75, 50, 25, 0].map((step) => (
                <div key={step} className="border-border/70 flex items-center gap-2 border-b border-dashed">
                  <span className="text-muted -mt-3 font-mono text-[10px]">
                    {Math.round((maxAnalyticsVal * step) / 100 / 1000)}k
                  </span>
                </div>
              ))}
            </div>

            <div className="relative z-[1] flex h-full w-full items-end justify-around gap-2 pl-8">
              {analyticsSeries.map((item, idx) => {
                const incPct = Math.max(8, Math.round((item.income / maxAnalyticsVal) * 100));
                const expPct = Math.max(8, Math.round((item.expense / maxAnalyticsVal) * 100));
                const isSelected = (activeMonthIdx ?? analyticsSeries.length - 1) === idx;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onMouseEnter={() => setActiveMonthIdx(idx)}
                    onClick={() => setActiveMonthIdx(idx)}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2 focus:outline-none cursor-pointer"
                    aria-label={`${item.label}: Income ${item.income}, Expense ${item.expense}`}
                  >
                    <div className="flex h-[132px] w-full items-end justify-center gap-1.5">
                      <div
                        className={cn(
                          "bg-accent w-3 rounded-t-md transition-all sm:w-3.5",
                          isSelected
                            ? "shadow-[0_0_16px_-2px_var(--accent)]"
                            : "opacity-85 group-hover:opacity-100",
                        )}
                        style={{ height: `${incPct}%` }}
                      />
                      <div
                        className="w-3 rounded-t-md bg-emerald-500/40 transition-all group-hover:bg-emerald-500/60 sm:w-3.5"
                        style={{ height: `${expPct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[11px] transition-colors",
                        isSelected ? "text-foreground font-semibold" : "text-muted",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ── ROW 3: Weekly Performance + Completion Overview Donut (from ref2.png) ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: Weekly Performance (Mon–Sun) */}
        <section className="border-border bg-surface flex flex-col justify-between gap-4 rounded-2xl border p-5 xl:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-tight">
                Weekly Performance
              </h3>
              <p className="text-muted text-xs">
                Daily focus minutes &amp; habit check-ins (Mon–Sun)
              </p>
            </div>
            <Link
              href="/focus"
              className="border-border bg-surface-2 text-muted hover:text-foreground flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors"
            >
              <Sparkles className="text-accent size-3.5" />
              <span>Focus Timer</span>
            </Link>
          </div>

          <div className="mt-2 grid h-48 grid-cols-7 items-end gap-2.5 pt-7 sm:gap-3.5">
            {weeklyDays.map((day, idx) => {
              const isPeak = idx === peakDayIdx;
              const heightPct = Math.max(16, Math.round((day.score / maxDayScore) * 100));
              return (
                <div
                  key={day.dateKey}
                  className="flex h-full flex-col items-center justify-end gap-2"
                >
                  <div className="relative flex h-[136px] w-full items-end justify-center">
                    {isPeak ? (
                      <span className="border-border bg-surface-2 text-foreground absolute -top-6 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap shadow">
                        {day.minutes > 0 ? `${day.minutes}m` : `${day.score}pt`}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "w-full max-w-[44px] rounded-xl transition-all",
                        isPeak
                          ? "bg-accent shadow-[0_8px_24px_-6px_var(--accent)]"
                          : "border-border bg-surface-2 hover:bg-surface-2/80 border",
                      )}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.label}: ${day.minutes}m focus, ${day.habitsDone} habits`}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-mono text-xs",
                      isPeak || day.isToday ? "text-foreground font-semibold" : "text-muted",
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Completion Overview Donut Chart */}
        <section className="border-border bg-surface flex flex-col justify-between gap-4 rounded-2xl border p-5 xl:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-foreground text-sm font-semibold tracking-tight">
                Completion Overview
              </h3>
              <p className="text-muted text-xs">Tasks &amp; habit streaks distribution</p>
            </div>
            <Link
              href="/tasks"
              className="text-muted hover:text-accent text-xs font-medium transition-colors"
            >
              Board →
            </Link>
          </div>

          <div className="flex flex-col items-center justify-between gap-6 py-2 sm:flex-row">
            {/* Multi-segment SVG Donut */}
            <div className="relative flex size-36 shrink-0 items-center justify-center">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="var(--surface-2)"
                  strokeWidth="12"
                />
                {donutStats.segments.map((seg) =>
                  seg.count > 0 ? (
                    <circle
                      key={seg.id}
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="12"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="round"
                    />
                  ) : null,
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-foreground font-mono text-2xl font-bold tracking-tight">
                  {donutStats.total}
                </span>
                <span className="text-muted text-[10px] font-medium uppercase tracking-wider">
                  Items
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex w-full flex-1 flex-col gap-2.5">
              {donutStats.segments.map((seg) => (
                <div
                  key={seg.id}
                  className="bg-surface-2/40 flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: seg.color }}
                      aria-hidden
                    />
                    <span className="text-muted truncate">{seg.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-foreground font-semibold">{seg.count}</span>
                    <span className="text-muted text-[10px]">({seg.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Add Card / Account Dialog */}
      <AccountDialog
        key={accountDialogOpen ? "dashboard-acc-open" : "dashboard-acc-closed"}
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        defaultCurrency={currency}
        onSave={onAddAccount}
      />
    </div>
  );
}
