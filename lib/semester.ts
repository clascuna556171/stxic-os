/**
 * Semester planner (term grid) helpers — week bucketing of tasks + Blackboard
 * deadlines. Pure and unit-tested. See docs/AGENT_EXTRAS.md (section D).
 */

import { riskLabel, riskScore } from "@/lib/blackboard/risk";
import type { BlackboardEvent, TaskItem } from "@/types";

export const TERM_WEEKS = 16;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00 (local) of the week containing `ts`. */
export function startOfWeekMonday(ts: number): number {
  const d = new Date(ts);
  const weekday = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weekday);
  return d.getTime();
}

export interface TermWeek {
  start: number;
  end: number; // exclusive
}

/** `weeks` consecutive Monday-start weeks beginning at the current week. */
export function buildTermGrid(now: number, weeks = TERM_WEEKS): TermWeek[] {
  const first = startOfWeekMonday(now);
  return Array.from({ length: weeks }, (_, i) => ({
    start: first + i * WEEK_MS,
    end: first + (i + 1) * WEEK_MS,
  }));
}

export type TermItemSource = "task" | "blackboard";

export interface TermItem {
  id: string;
  title: string;
  due: number;
  source: TermItemSource;
  priority?: TaskItem["priority"];
  risk?: "Low" | "Med" | "High" | "Critical";
}

/** Items (open tasks + Blackboard deadlines) due within `week`, sorted by due. */
export function termItemsForWeek(
  week: TermWeek,
  tasks: TaskItem[],
  events: BlackboardEvent[],
  now: number,
): TermItem[] {
  const items: TermItem[] = [];

  for (const t of tasks) {
    if (t.status === "done" || t.dueDate == null) continue;
    if (t.dueDate >= week.start && t.dueDate < week.end) {
      items.push({
        id: t.id,
        title: t.title,
        due: t.dueDate,
        source: "task",
        priority: t.priority,
      });
    }
  }

  for (const e of events) {
    if (e.dtstart >= week.start && e.dtstart < week.end) {
      items.push({
        id: e.uid,
        title: e.summary,
        due: e.dtstart,
        source: "blackboard",
        risk: riskLabel(riskScore(e, now)),
      });
    }
  }

  return items.sort((a, b) => a.due - b.due);
}
