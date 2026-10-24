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
import { toast } from "@/components/ui/toaster";
import { useAuth } from "@/components/auth/auth-provider";
import { BentoOverview } from "@/components/features/dashboard/bento-overview";
import { CapsuleMetrics } from "@/components/features/dashboard/capsule-metrics";
import { DashboardGrid } from "@/components/features/dashboard/grid";
import { WidgetBody } from "@/components/features/dashboard/widget-body";
import { WIDGETS, defaultLayout } from "@/lib/dashboard/widgets";
import { isEnabled } from "@/lib/config/features";
import {
  getSettings,
  listAccounts,
  listFocusSessions,
  listHabits,
  listSavingsGoals,
  listTasks,
  listTransactions,
  saveAccount,
  saveSettings,
} from "@/lib/hydrate";
import { weeklyFocusStat } from "@/lib/focus";
import type {
  Currency,
  DashboardWidget,
  FinanceAccount,
  FocusSession,
  Habit,
  SavingsGoal,
  TaskItem,
  Transaction,
} from "@/types";

export default function DashboardPage() {
  const { user, demo } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [rawFocusSessions, setRawFocusSessions] = useState<FocusSession[]>([]);
  const [today, setToday] = useState(0);
  const [focusMin, setFocusMin] = useState(0);
  const [focusSessions, setFocusSessions] = useState(0);
  const [currency, setCurrency] = useState<Currency>("PHP");
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const holderName: string = demo
    ? user?.displayName || "Demo Guest"
    : user?.displayName || (user?.email ? (user.email.split("@")[0] ?? "Stxic Operator") : "Stxic Operator");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [t, f, i, s, h, a, g] = await Promise.all([
        listTasks(),
        listFocusSessions(),
        listTransactions(),
        getSettings(),
        listHabits(),
        listAccounts(),
        listSavingsGoals(),
      ]);
      if (cancelled) return;
      if (t.ok) setTasks(t.data);
      if (f.ok) {
        setRawFocusSessions(f.data);
        const stat = weeklyFocusStat(f.data);
        setFocusMin(stat.totalMinutes);
        setFocusSessions(stat.sessions);
      }
      if (i.ok) setTransactions(i.data);
      if (a.ok) setAccounts(a.data);
      if (g.ok) setSavingsGoals(g.data);
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

  async function handleAddAccount(account: FinanceAccount) {
    const res = await saveAccount(account);
    if (!res.ok) {
      toast({ title: "Couldn't save card", description: res.error, variant: "danger" });
      return;
    }
    setAccounts((prev) => {
      const idx = prev.findIndex((x) => x.id === account.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = account;
        return copy;
      }
      return [...prev, account];
    });
    toast({ title: "Card added to your wallet" });
  }

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
      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <Skeleton className="h-56 rounded-2xl xl:col-span-5" />
            <Skeleton className="h-56 rounded-2xl xl:col-span-7" />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <Skeleton className="h-64 rounded-2xl xl:col-span-5" />
            <Skeleton className="h-64 rounded-2xl xl:col-span-7" />
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

          <BentoOverview
            accounts={accounts}
            transactions={transactions}
            savingsGoals={savingsGoals}
            tasks={tasks}
            habits={habits}
            focusSessions={rawFocusSessions}
            currency={currency}
            holderName={holderName}
            onAddAccount={handleAddAccount}
          />

          <section className="flex flex-col gap-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-foreground text-base font-semibold tracking-tight">
                  Workspace Modules
                </h2>
                <p className="text-muted text-xs">
                  Customizable utilities — drag, resize, or add modules.
                </p>
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
            </div>

            <DashboardGrid
              widgets={
                isEnabled("obsidianLive")
                  ? widgets
                  : widgets.filter((w) => w.id !== "obsidianGraph")
              }
              onChange={changeLayout}
              onHide={hideWidget}
              renderWidget={(id) => <WidgetBody id={id} data={data} />}
            />
          </section>
        </>
      )}
    </div>
  );
}
