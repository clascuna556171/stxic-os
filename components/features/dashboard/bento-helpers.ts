import { monthKey } from "@/lib/finance";
import { startOfWeek } from "@/lib/focus";
import { toISODate } from "@/lib/utils/dates";
import type { FocusSession, Habit, TaskItem, Transaction } from "@/types";

export interface MonthlyAnalyticsPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
}

const SHORT_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns `monthsCount` consecutive monthly buckets ending at `now` (oldest first),
 * populated with summed `income` and `expense` transactions.
 */
export function netByMonth(
  transactions: Transaction[],
  monthsCount = 6,
  now = Date.now(),
): MonthlyAnalyticsPoint[] {
  const buckets = new Map<string, MonthlyAnalyticsPoint>();
  const baseDate = new Date(now);

  for (let offset = monthsCount - 1; offset >= 0; offset--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short" });
    buckets.set(key, { key, label, income: 0, expense: 0 });
  }

  for (const tx of transactions) {
    const k = monthKey(tx.date);
    const existing = buckets.get(k);
    if (existing) {
      if (tx.type === "income") existing.income += tx.amount;
      else existing.expense += tx.amount;
    }
  }

  return [...buckets.values()];
}

export interface WeeklyDayPoint {
  label: string;
  dateKey: string;
  minutes: number;
  habitsDone: number;
  tasksUpdated: number;
  score: number;
  isToday: boolean;
}

/**
 * Aggregates Mon–Sun performance for the current week from focus sessions,
 * habit check-in logs, and completed tasks.
 */
export function startOfWeekFocusDays(
  focusSessions: FocusSession[],
  tasks: TaskItem[],
  habits: Habit[],
  now = Date.now(),
): WeeklyDayPoint[] {
  const weekStart = startOfWeek(now);
  const todayKey = toISODate(now);

  return SHORT_WEEKDAYS.map((label, idx) => {
    const dayStart = weekStart + idx * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const dateKey = toISODate(dayStart);

    const daySeconds = focusSessions
      .filter((s) => s.start >= dayStart && s.start < dayEnd)
      .reduce((sum, s) => sum + s.duration, 0);
    const minutes = Math.round(daySeconds / 60);

    const habitsDone = habits.filter((h) => h.log?.[dateKey] === true).length;
    const tasksUpdated = tasks.filter(
      (t) => t.status === "done" && t.updatedAt >= dayStart && t.updatedAt < dayEnd,
    ).length;

    const score = minutes + habitsDone * 15 + tasksUpdated * 20;

    return {
      label,
      dateKey,
      minutes,
      habitsDone,
      tasksUpdated,
      score,
      isToday: dateKey === todayKey,
    };
  });
}
