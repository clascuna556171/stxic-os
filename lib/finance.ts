/**
 * Finance helpers — transaction ledger (income + expense), account balances,
 * savings goals, CSV rows. Pure and unit-tested.
 */

import type { Currency, FinanceAccount, IncomeEntry, SavingsGoal, Transaction } from "@/types";
import { toISODate } from "@/lib/utils/dates";

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Allowance",
  "Gift",
  "Scholarship",
  "Investment",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Subscriptions",
  "Other",
] as const;

/** "YYYY-MM" key for a timestamp. */
export function monthKey(ts: number): string {
  return toISODate(ts).slice(0, 7);
}

/** Human label for a "YYYY-MM" key, e.g. "Aug 26". */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export interface MonthlyTotal {
  key: string;
  label: string;
  total: number;
}

/** Totals for a type (or all) summed across currencies, oldest month first. */
export function monthlyTotals(txs: Transaction[], type?: Transaction["type"]): MonthlyTotal[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (type && t.type !== type) continue;
    const key = monthKey(t.date);
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({ key, label: monthLabel(key), total }));
}

export interface MonthNet {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

/** Per-month income vs expense (for the overview chart). Oldest month first. */
export function netByMonth(txs: Transaction[]): MonthNet[] {
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    const key = monthKey(t.date);
    const entry = map.get(key) ?? { income: 0, expense: 0 };
    if (t.type === "income") entry.income += t.amount;
    else entry.expense += t.amount;
    map.set(key, entry);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      key,
      label: monthLabel(key),
      income: v.income,
      expense: v.expense,
      net: v.income - v.expense,
    }));
}

export interface MonthGroup {
  key: string;
  label: string;
  total: number;
  entries: Transaction[];
}

/** Transactions grouped by month, newest month first; entries newest first. */
export function groupByMonth(txs: Transaction[]): MonthGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = monthKey(t.date);
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({
      key,
      label: monthLabel(key),
      total: list.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0),
      entries: list.sort((a, b) => b.date - a.date),
    }));
}

/** Sum of transactions within an optional type/month filter (positive amounts). */
export function sumTransactions(
  txs: Transaction[],
  type?: Transaction["type"],
  month?: string,
): number {
  return txs
    .filter((t) => (type ? t.type === type : true))
    .filter((t) => (month ? monthKey(t.date) === month : true))
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Rows for CSV export (Excel-friendly, date as ISO, type column). */
export function transactionToCsv(txs: Transaction[]): Array<Record<string, unknown>> {
  return txs
    .slice()
    .sort((a, b) => b.date - a.date)
    .map((t) => ({
      type: t.type,
      label: t.label,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      date: toISODate(t.date),
    }));
}

/** Account balances summed per currency. */
export function accountTotalsByCurrency(accounts: FinanceAccount[]): Map<Currency, number> {
  const map = new Map<Currency, number>();
  for (const a of accounts) map.set(a.currency, (map.get(a.currency) ?? 0) + a.balance);
  return map;
}

/** Progress toward a goal, clamped 0–100. Returns 0 when target is 0. */
export function goalPercent(goal: SavingsGoal): number {
  if (goal.target <= 0) return 0;
  return Math.min(100, Math.round((goal.saved / goal.target) * 100));
}

export interface SavingsTotals {
  saved: number;
  target: number;
  percent: number;
}

/** Aggregate savings across all goals, per currency. */
export function savingsTotalsByCurrency(goals: SavingsGoal[]): Map<Currency, SavingsTotals> {
  const map = new Map<Currency, SavingsTotals>();
  for (const g of goals) {
    const cur = map.get(g.currency) ?? { saved: 0, target: 0, percent: 0 };
    cur.saved += g.saved;
    cur.target += g.target;
    map.set(g.currency, cur);
  }
  for (const cur of map.values()) cur.percent = cur.target > 0 ? Math.round((cur.saved / cur.target) * 100) : 0;
  return map;
}

/** Legacy income entries → income transactions (one-time migration). */
export function migrateIncomeToTransactions(income: IncomeEntry[]): Transaction[] {
  return income.map((e) => ({
    id: e.id,
    type: "income",
    label: e.label,
    amount: e.amount,
    currency: e.currency,
    category: e.category,
    date: e.date,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));
}

function perCurrencyText(txs: Transaction[], type?: Transaction["type"]): string {
  const map = new Map<Currency, number>();
  for (const t of txs) {
    if (type && t.type !== type) continue;
    map.set(t.currency, (map.get(t.currency) ?? 0) + t.amount);
  }
  const parts = [...map.entries()].map(([c, v]) => `${v} ${c}`);
  return parts.length ? parts.join(", ") : "0";
}

/**
 * A compact, model-friendly summary of the user's finances (used to ground
 * the finance assistant's answers in real numbers). Pure + unit-tested.
 */
export function buildFinanceContext(
  txs: Transaction[],
  accounts: FinanceAccount[],
  goals: SavingsGoal[],
): string {
  const month = monthKey(Date.now());
  return [
    `This month (${month}): income ${perCurrencyText(txs.filter((t) => monthKey(t.date) === month), "income")}, expenses ${perCurrencyText(txs.filter((t) => monthKey(t.date) === month), "expense")}.`,
    `All time: income ${perCurrencyText(txs, "income")}, expenses ${perCurrencyText(txs, "expense")}.`,
    `Accounts: ${accounts.length ? accounts.map((a) => `${a.name} ${a.balance} ${a.currency}`).join(", ") : "none"}.`,
    `Savings goals: ${goals.length ? goals.map((g) => `${g.name} ${g.saved}/${g.target} ${g.currency}`).join(", ") : "none"}.`,
    `Transactions on file: ${txs.length}.`,
  ].join("\n");
}
