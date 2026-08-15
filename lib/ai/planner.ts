/**
 * AI study planner helpers — collapse open tasks + available time into the
 * study-planner prompt, then build the chat messages. Pure and unit-tested.
 * See docs/AGENT_AI.md.
 */

import { studyPlannerPrompt } from "./prompts";
import type { ChatMessage } from "./types";
import { formatDate } from "@/lib/utils/dates";
import type { TaskItem } from "@/types";

export type StudyDays = "weekdays" | "everyday";

export interface PlannerContext {
  tasks: TaskItem[];
  hoursPerDay: number;
  studyDays: StudyDays;
  now: number;
}

const PRIORITY_ORDER: Record<TaskItem["priority"], number> = { P0: 0, P1: 1, P2: 2 };

const MAX_TASKS = 15;

/** Collapse live tasks + availability into the strings the prompt expects. */
export function buildPlannerContext(ctx: PlannerContext): { tasks: string; available: string } {
  const tasks = ctx.tasks
    .filter((t) => t.status !== "done")
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, MAX_TASKS)
    .map((t) => {
      const parts = [`${t.priority} ${t.title}`];
      if (t.type === "assignment") parts.push("[assignment]");
      if (t.dueDate != null) parts.push(`(due ${formatDate(t.dueDate)})`);
      return parts.join(" ");
    })
    .join("; ");

  const available =
    ctx.studyDays === "weekdays"
      ? `${ctx.hoursPerDay} hours/day on weekdays (Mon-Fri), 0 on weekends`
      : `${ctx.hoursPerDay} hours/day every day`;

  return { tasks: tasks || "none", available };
}

/** System + user messages for the study planner. */
export function plannerMessages(ctx: PlannerContext): ChatMessage[] {
  return [
    { role: "system", content: studyPlannerPrompt(buildPlannerContext(ctx)) },
    {
      role: "user",
      content: `Today is ${new Date(ctx.now).toDateString()}. Build my 7-day study plan.`,
    },
  ];
}
