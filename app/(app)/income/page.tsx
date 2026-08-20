"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  CircleDollarSign,
  CreditCard,
  Download,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { TransactionDialog } from "@/components/features/income/transaction-dialog";
import { AccountDialog } from "@/components/features/income/account-dialog";
import { SavingsDialog } from "@/components/features/income/savings-dialog";
import { FinanceAssistant } from "@/components/features/income/finance-assistant";
import {
  deleteAccount,
  deleteSavingsGoal,
  deleteTransaction,
  deleteIncomeEntry,
  getSettings,
  listAccounts,
  listIncome,
  listSavingsGoals,
  listTransactions,
  saveAccount,
  saveSavingsGoal,
  saveTransaction,
} from "@/lib/hydrate";
import {
  accountTotalsByCurrency,
  buildFinanceContext,
  goalPercent,
  groupByMonth,
  migrateIncomeToTransactions,
  monthKey,
  netByMonth,
  savingsTotalsByCurrency,
  sumTransactions,
  transactionToCsv,
} from "@/lib/finance";
import { downloadCsv, toCsv } from "@/lib/utils/csv";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, toISODate } from "@/lib/utils/dates";
import type { AccountKind, Currency, FinanceAccount, SavingsGoal, Transaction } from "@/types";

const FinanceChart = dynamic(
  () => import("@/components/features/income/finance-chart").then((m) => m.FinanceChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  cash: "Cash",
  debit: "Debit",
  credit: "Credit",
  "e-wallet": "E-wallet",
  savings: "Savings",
  other: "Other",
};

function totalsByCurrency(entries: Array<{ amount: number; currency: Currency }>): Map<Currency, number> {
  const map = new Map<Currency, number>();
  for (const e of entries) map.set(e.currency, (map.get(e.currency) ?? 0) + e.amount);
  return map;
}

function currencyTotalText(map: Map<Currency, number>): string {
  if (map.size === 0) return formatCurrency(0, "PHP");
  return [...map.entries()].map(([c, v]) => formatCurrency(v, c)).join(" · ");
}

function percentBar(percent: number) {
  const color = percent >= 100 ? "var(--success)" : "var(--accent)";
  return (
    <div className="bg-surface-2 h-2 w-full overflow-hidden rounded-full">
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out)]"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
}

export default function IncomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("PHP");
  const [thisMonthKey, setThisMonthKey] = useState("");
  const [todayIso, setTodayIso] = useState("");

  const [txDialog, setTxDialog] = useState<{ open: boolean; editing?: Transaction }>({ open: false });
  const [accDialog, setAccDialog] = useState<{ open: boolean; editing?: FinanceAccount }>({ open: false });
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; editing?: SavingsGoal }>({ open: false });
  const [deleting, setDeleting] = useState<{ kind: "tx" | "acc" | "goal"; label: string; id: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [txRes, incRes, accRes, goalRes, settingsRes] = await Promise.all([
        listTransactions(),
        listIncome(),
        listAccounts(),
        listSavingsGoals(),
        getSettings(),
      ]);
      if (cancelled) return;
      setThisMonthKey(monthKey(Date.now()));
      setTodayIso(toISODate(Date.now()));

      if (txRes.ok && incRes.ok && txRes.data.length === 0 && incRes.data.length > 0) {
        const migrated = migrateIncomeToTransactions(incRes.data);
        const results = await Promise.all(migrated.map((t) => saveTransaction(t)));
        if (results.every((r) => r.ok)) {
          await Promise.all(incRes.data.map((e) => deleteIncomeEntry(e.id)));
          setTransactions(migrated);
          toast({
            title: "Income imported",
            description: `Moved ${migrated.length} old income entr${migrated.length === 1 ? "y" : "ies"} to the new finance ledger.`,
            variant: "success",
          });
        } else {
          setTransactions(migrated);
          toast({
            title: "Saved locally",
            description: "Some legacy income entries couldn't be cleaned up. They'll re-import next visit.",
          });
        }
      } else if (txRes.ok) {
        setTransactions(txRes.data);
      } else {
        setError(txRes.error);
      }

      if (accRes.ok) setAccounts(accRes.data);
      if (goalRes.ok) setGoals(goalRes.data);
      if (settingsRes.ok) setDefaultCurrency(settingsRes.data.defaultCurrency);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => groupByMonth(transactions), [transactions]);
  const netMonths = useMemo(() => netByMonth(transactions), [transactions]);
  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category))], [transactions]);

  const thisMonthTxs = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === thisMonthKey),
    [transactions, thisMonthKey],
  );
  const thisMonthIncome = sumTransactions(thisMonthTxs, "income");
  const thisMonthExpense = sumTransactions(thisMonthTxs, "expense");

  const netMap = new Map<Currency, number>();
  for (const t of transactions)
    netMap.set(t.currency, (netMap.get(t.currency) ?? 0) + (t.type === "income" ? t.amount : -t.amount));

  const thisMonthNetMap = new Map<Currency, number>();
  for (const t of thisMonthTxs)
    thisMonthNetMap.set(t.currency, (thisMonthNetMap.get(t.currency) ?? 0) + (t.type === "income" ? t.amount : -t.amount));

  const accountTotals = useMemo(() => accountTotalsByCurrency(accounts), [accounts]);
  const savingsTotals = useMemo(() => savingsTotalsByCurrency(goals), [goals]);

  const financeContext = useMemo(
    () => buildFinanceContext(transactions, accounts, goals),
    [transactions, accounts, goals],
  );

  /** Re-fetch the ledger so the assistant's changes show up everywhere. */
  async function reload() {
    const [txRes, accRes, goalRes] = await Promise.all([
      listTransactions(),
      listAccounts(),
      listSavingsGoals(),
    ]);
    if (txRes.ok) setTransactions(txRes.data);
    if (accRes.ok) setAccounts(accRes.data);
    if (goalRes.ok) setGoals(goalRes.data);
  }

  async function saveTransactionAsync(entry: Transaction) {
    const res = await saveTransaction(entry);
    if (res.ok) {
      setTransactions((prev) =>
        prev.some((e) => e.id === entry.id)
          ? prev.map((e) => (e.id === entry.id ? entry : e))
          : [...prev, entry],
      );
      toast({ title: "Saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  async function saveAccountAsync(account: FinanceAccount) {
    const res = await saveAccount(account);
    if (res.ok) {
      setAccounts((prev) =>
        prev.some((a) => a.id === account.id)
          ? prev.map((a) => (a.id === account.id ? account : a))
          : [...prev, account],
      );
      toast({ title: "Saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  async function saveGoalAsync(goal: SavingsGoal) {
    const res = await saveSavingsGoal(goal);
    if (res.ok) {
      setGoals((prev) =>
        prev.some((g) => g.id === goal.id)
          ? prev.map((g) => (g.id === goal.id ? goal : g))
          : [...prev, goal],
      );
      toast({ title: "Saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res =
      deleting.kind === "tx"
        ? await deleteTransaction(deleting.id)
        : deleting.kind === "acc"
          ? await deleteAccount(deleting.id)
          : await deleteSavingsGoal(deleting.id);
    if (res.ok) {
      if (deleting.kind === "tx") setTransactions((prev) => prev.filter((e) => e.id !== deleting.id));
      if (deleting.kind === "acc") setAccounts((prev) => prev.filter((a) => a.id !== deleting.id));
      if (deleting.kind === "goal") setGoals((prev) => prev.filter((g) => g.id !== deleting.id));
      toast({ title: "Deleted" });
    } else {
      toast({ title: "Delete failed", description: res.error, variant: "danger" });
    }
    setDeleting(null);
  }

  function exportCsv() {
    if (transactions.length === 0) return;
    const rows = transactionToCsv(transactions);
    downloadCsv("stxic-finance", toCsv(rows));
  }

  const recent = useMemo(() => transactions.slice().sort((a, b) => b.date - a.date).slice(0, 8), [transactions]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Finance</h2>
          <p className="text-muted text-sm">
            {transactions.length} transaction{transactions.length === 1 ? "" : "s"} · {accounts.length} account
            {accounts.length === 1 ? "" : "s"} · {goals.length} goal{goals.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <EmptyState icon={<CircleDollarSign />} title="Couldn't load finance data" description={error} />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="w-full overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
          </TabsList>

          {/* ── Overview ─────────────────────────────────────── */}
          <TabsContent value="overview" className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5">
                    <Landmark className="text-muted size-4" /> Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-lg font-semibold">
                  {currencyTotalText(accountTotals)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>This month</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-lg font-semibold">
                  {currencyTotalText(thisMonthNetMap)}
                </CardContent>
                <CardContent className="text-muted flex flex-col gap-0.5 pt-0 text-xs">
                  <span className="text-success">+{formatCurrency(thisMonthIncome, "PHP", true)} income</span>
                  <span className="text-danger">−{formatCurrency(thisMonthExpense, "PHP", true)} expenses</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>All time net</CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-lg font-semibold">
                  {currencyTotalText(netMap)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5">
                    <PiggyBank className="text-muted size-4" /> Savings
                  </CardTitle>
                </CardHeader>
                <CardContent className="font-mono text-lg font-semibold">
                  {goals.length === 0
                    ? formatCurrency(0, "PHP")
                    : [...savingsTotals.entries()].map(([c, t]) => formatCurrency(t.saved, c)).join(" · ")}
                </CardContent>
                <CardContent className="text-muted pt-0 text-xs">
                  {goals.length === 0 ? "No goals yet" : `${[...savingsTotals.values()].reduce((s, t) => s + t.percent, 0) / savingsTotals.size}% of target`}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_20rem]">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Monthly income vs expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {netMonths.length === 0 ? (
                    <EmptyState
                      icon={<CircleDollarSign />}
                      title="No transactions yet"
                      description="Add income or expenses to see the chart."
                      action={
                        <Button variant="primary" onClick={() => setTxDialog({ open: true })}>
                          <Plus />
                          Add transaction
                        </Button>
                      }
                    />
                  ) : (
                    <FinanceChart data={netMonths} currency={defaultCurrency} />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Recent activity</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {recent.length === 0 ? (
                    <p className="text-muted text-sm">Nothing yet — add your first transaction.</p>
                  ) : (
                    recent.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-medium">{t.label}</p>
                          <p className="text-muted text-xs">
                            {t.category} · {formatDate(t.date)}
                          </p>
                        </div>
                        <span className={`font-mono text-sm ${t.type === "income" ? "text-success" : "text-danger"}`}>
                          {t.type === "income" ? "+" : "−"}
                          {formatCurrency(t.amount, t.currency)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {accounts.length > 0 || goals.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {accounts.length > 0 ? (
                  <Card>
                    <CardHeader className="flex-row items-center justify-between pb-2">
                      <CardTitle>Accounts</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setTxDialog({ open: true })}>
                        <Plus />
                        Add
                      </Button>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      {accounts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-medium">{a.name}</p>
                            <p className="text-muted text-xs">
                              {ACCOUNT_KIND_LABELS[a.kind]}
                              {a.last4 ? ` · ··· ${a.last4}` : ""}
                            </p>
                          </div>
                          <span className="font-mono text-sm">{formatCurrency(a.balance, a.currency)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
                {goals.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Savings goals</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {goals.map((g) => (
                        <div key={g.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-foreground truncate font-medium">{g.name}</span>
                            <span className="text-muted font-mono">
                              {formatCurrency(g.saved, g.currency)} / {formatCurrency(g.target, g.currency)}
                            </span>
                          </div>
                          {percentBar(goalPercent(g))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </TabsContent>

          {/* ── Transactions ─────────────────────────────────── */}
          <TabsContent value="transactions" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Income</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">
                    {currencyTotalText(totalsByCurrency(transactions.filter((t) => t.type === "income")))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">
                    {currencyTotalText(totalsByCurrency(transactions.filter((t) => t.type === "expense")))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Net</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">{currencyTotalText(netMap)}</CardContent>
                </Card>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={exportCsv} disabled={transactions.length === 0}>
                  <Download />
                  Export CSV
                </Button>
                <Button variant="primary" onClick={() => setTxDialog({ open: true })}>
                  <Plus />
                  Add transaction
                </Button>
              </div>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon={<CircleDollarSign />}
                title="No transactions yet"
                description="Track income and expenses to see your money flow."
                action={
                  <Button variant="primary" onClick={() => setTxDialog({ open: true })}>
                    <Plus />
                    Add transaction
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <Card key={g.key}>
                    <CardHeader className="flex-row items-center justify-between pb-2">
                      <CardTitle>{g.label}</CardTitle>
                      <Badge variant="muted">{currencyTotalText(totalsByCurrency(g.entries.map((t) => ({ amount: t.type === "income" ? t.amount : -t.amount, currency: t.currency }))))}</Badge>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      {g.entries.map((t) => (
                        <div
                          key={t.id}
                          className="hover:bg-surface-2/50 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Badge variant={t.type === "income" ? "success" : "danger"}>
                              {t.type === "income" ? "In" : "Out"}
                            </Badge>
                            <div className="min-w-0">
                              <p className="text-foreground truncate text-sm font-medium">{t.label}</p>
                              <p className="text-muted text-xs">
                                {t.category} · {formatDate(t.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`font-mono text-sm ${t.type === "income" ? "text-success" : "text-danger"}`}>
                              {t.type === "income" ? "+" : "−"}
                              {formatCurrency(t.amount, t.currency)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => setTxDialog({ open: true, editing: t })}
                              aria-label="Edit"
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted hover:text-danger size-8"
                              onClick={() => setDeleting({ kind: "tx", label: t.label, id: t.id })}
                              aria-label="Delete"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Accounts ─────────────────────────────────────── */}
          <TabsContent value="accounts" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Total balance</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">
                    {currencyTotalText(accountTotals)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">{accounts.length}</CardContent>
                </Card>
              </div>
              <Button variant="primary" onClick={() => setAccDialog({ open: true })}>
                <Plus />
                Add account
              </Button>
            </div>

            {accounts.length === 0 ? (
              <EmptyState
                icon={<CreditCard />}
                title="No accounts yet"
                description="Add your cards and banks to see your total balance at a glance."
                action={
                  <Button variant="primary" onClick={() => setAccDialog({ open: true })}>
                    <Plus />
                    Add account
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((a) => (
                  <Card key={a.id}>
                    <CardHeader className="flex-row items-start justify-between pb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="text-muted size-5" />
                        <div>
                          <CardTitle>{a.name}</CardTitle>
                          <p className="text-muted text-xs">
                            {ACCOUNT_KIND_LABELS[a.kind]}
                            {a.last4 ? ` · ··· ${a.last4}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setAccDialog({ open: true, editing: a })}
                          aria-label="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted hover:text-danger size-8"
                          onClick={() => setDeleting({ kind: "acc", label: a.name, id: a.id })}
                          aria-label="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="font-mono text-lg font-semibold">
                      {formatCurrency(a.balance, a.currency)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Savings ──────────────────────────────────────── */}
          <TabsContent value="savings" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Saved</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">
                    {goals.length === 0
                      ? formatCurrency(0, "PHP")
                      : [...savingsTotals.entries()].map(([c, t]) => formatCurrency(t.saved, c)).join(" · ")}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Target</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">
                    {goals.length === 0
                      ? formatCurrency(0, "PHP")
                      : [...savingsTotals.entries()].map(([c, t]) => formatCurrency(t.target, c)).join(" · ")}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Overall progress</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-lg font-semibold">
                    {goals.length === 0
                      ? "0%"
                      : `${Math.round(([...savingsTotals.values()].reduce((s, t) => s + t.saved, 0) / [...savingsTotals.values()].reduce((s, t) => s + t.target, 0)) * 100)}%`}
                  </CardContent>
                </Card>
              </div>
              <Button variant="primary" onClick={() => setGoalDialog({ open: true })}>
                <Plus />
                New goal
              </Button>
            </div>

            {goals.length === 0 ? (
              <EmptyState
                icon={<Target />}
                title="No savings goals yet"
                description="Set a target — emergency fund, a trip, a gadget — and track progress."
                action={
                  <Button variant="primary" onClick={() => setGoalDialog({ open: true })}>
                    <Plus />
                    New goal
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {goals.map((g) => {
                  const percent = goalPercent(g);
                  return (
                    <Card key={g.id}>
                      <CardHeader className="flex-row items-start justify-between pb-2">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="text-muted size-5" />
                          <div>
                            <CardTitle>{g.name}</CardTitle>
                            <p className="text-muted text-xs">
                              {g.deadline ? `By ${formatDate(g.deadline)}` : "No deadline"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setGoalDialog({ open: true, editing: g })}
                            aria-label="Edit"
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted hover:text-danger size-8"
                            onClick={() => setDeleting({ kind: "goal", label: g.name, id: g.id })}
                            aria-label="Delete"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                          <span className="font-mono text-lg font-semibold">{formatCurrency(g.saved, g.currency)}</span>
                          <span className="text-muted text-sm">
                            of {formatCurrency(g.target, g.currency)} · {percent}%
                          </span>
                        </div>
                        {percentBar(percent)}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Assistant ────────────────────────────────────── */}
          <TabsContent value="assistant" className="flex flex-col gap-4">
            <FinanceAssistant
              defaultCurrency={defaultCurrency}
              context={financeContext}
              onChanged={() => void reload()}
            />
          </TabsContent>
        </Tabs>
      )}

      <TransactionDialog
        open={txDialog.open}
        onOpenChange={(o) => !o && setTxDialog({ open: false })}
        initial={txDialog.editing}
        defaultCurrency={defaultCurrency}
        defaultDate={todayIso}
        categories={categories}
        onSave={saveTransactionAsync}
      />

      <AccountDialog
        open={accDialog.open}
        onOpenChange={(o) => !o && setAccDialog({ open: false })}
        initial={accDialog.editing}
        defaultCurrency={defaultCurrency}
        onSave={saveAccountAsync}
      />

      <SavingsDialog
        open={goalDialog.open}
        onOpenChange={(o) => !o && setGoalDialog({ open: false })}
        initial={goalDialog.editing}
        defaultCurrency={defaultCurrency}
        onSave={saveGoalAsync}
      />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.label}”?</DialogTitle>
            <DialogDescription>This permanently removes it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
