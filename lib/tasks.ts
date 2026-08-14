/**
 * Task helpers — status/priority metadata, calendar grid, due-date checks.
 * Pure (no Firestore) and unit-tested.
 */

import type { TaskItem, TaskPriority, TaskStatus } from "@/types";
import { startOfDay, toISODate } from "@/lib/utils/dates";

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const PRIORITIES: TaskPriority[] = ["P0", "P1", "P2"];

/** True when a non-done task is due before today. */
export function isOverdue(task: TaskItem, now = Date.now()): boolean {
  return task.status !== "done" && task.dueDate != null && task.dueDate < startOfDay(now);
}

/** True when a task is due on the given day. */
export function isDueOn(task: TaskItem, date: Date): boolean {
  return task.dueDate != null && toISODate(task.dueDate) === toISODate(date);
}

/** Month grid: weeks of Date|null, Monday-first (for the calendar view). */
export function monthGrid(year: number, month: number): Array<Array<Date | null>> {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday = 0
  const cells: Array<Date | null> = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<Date | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Tasks due on a specific date, sorted by priority then title. */
export function tasksOnDate(tasks: TaskItem[], date: Date): TaskItem[] {
  const key = toISODate(date);
  const order: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2 };
  return tasks
    .filter((t) => t.dueDate != null && toISODate(t.dueDate) === key)
    .sort((a, b) => order[a.priority] - order[b.priority] || a.title.localeCompare(b.title));
}
