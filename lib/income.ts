/**
 * Income helpers — month grouping, totals, CSV rows. Pure and unit-tested.
 */

import type { IncomeEntry } from "@/types";
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

/** Totals summed across all currencies, oldest month first. */
export function monthlyTotals(entries: IncomeEntry[]): MonthlyTotal[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = monthKey(e.date);
    map.set(key, (map.get(key) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({ key, label: monthLabel(key), total }));
}

export interface MonthGroup {
  key: string;
  label: string;
  total: number;
  entries: IncomeEntry[];
}

/** Entries grouped by month, newest month first; entries newest first. */
export function groupByMonth(entries: IncomeEntry[]): MonthGroup[] {
  const map = new Map<string, IncomeEntry[]>();
  for (const e of entries) {
    const key = monthKey(e.date);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({
      key,
      label: monthLabel(key),
      total: list.reduce((sum, e) => sum + e.amount, 0),
      entries: list.sort((a, b) => b.date - a.date),
    }));
}

/** Sum of entries within an optional month filter. */
export function sumEntries(entries: IncomeEntry[], month?: string): number {
  return entries
    .filter((e) => (month ? monthKey(e.date) === month : true))
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Rows for CSV export (Excel-friendly, date as ISO). */
export function incomeToCsv(entries: IncomeEntry[]): Array<Record<string, unknown>> {
  return entries
    .slice()
    .sort((a, b) => b.date - a.date)
    .map((e) => ({
      label: e.label,
      amount: e.amount,
      currency: e.currency,
      category: e.category,
      date: toISODate(e.date),
    }));
}
