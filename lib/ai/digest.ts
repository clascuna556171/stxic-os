/**
 * AI daily digest helpers — context assembly + prompt messages + parsing the
 * model's `top3Priorities` JSON. Pure and unit-tested. See docs/AGENT_AI.md.
 */

import { dailyDigestPrompt, type DailyDigestContext } from "./prompts";
import type { ChatMessage } from "./types";
import { currentStreak } from "@/lib/habits";
import type { Habit, TaskItem } from "@/types";

export interface DigestContext {
  tasks: TaskItem[];
  habits: Habit[];
  focusMinutes: number;
  now: number;
}

/** Collapse live data into the compact strings the prompt expects. */
export function buildDigestContext(ctx: DigestContext): DailyDigestContext {
  const tasks =
    ctx.tasks
      .filter((t) => t.status !== "done")
      .slice(0, 10)
      .map(
        (t) =>
          `${t.priority} ${t.title}${t.dueDate ? ` (due ${new Date(t.dueDate).toDateString()})` : ""}`,
      )
      .join("; ") || "none";

  const habits =
    ctx.habits.map((h) => `${h.name}: ${currentStreak(h.log, ctx.now)}-day streak`).join("; ") ||
    "none";

  return {
    date: new Date(ctx.now).toDateString(),
    tasks,
    habits,
    focus: `${ctx.focusMinutes}m focused this week`,
  };
}

/** System + user messages for the digest. */
export function digestMessages(ctx: DigestContext): ChatMessage[] {
  return [
    { role: "system", content: dailyDigestPrompt(buildDigestContext(ctx)) },
    { role: "user", content: "Write my daily digest." },
  ];
}

/** Extract the `top3Priorities` string array from the model's output. */
export function parseTopPriorities(text: string): string[] {
  const m = text.match(/"top3Priorities"\s*:\s*(\[[^\]]*\])/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[1]!) as unknown;
    if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

/** Remove the trailing JSON block (optionally fenced) for clean markdown render. */
export function stripJsonBlock(text: string): string {
  return text
    .replace(/```(?:json)?\s*\{[\s\S]*?"top3Priorities"[\s\S]*?\}\s*```/i, "")
    .replace(/\{[\s\S]*?"top3Priorities"[\s\S]*?\}\s*$/i, "")
    .trim();
}
