/**
 * Habit tracker helpers — streak math + AI nudge messages. Pure and unit-tested.
 * The `log` record (ISO date → completed) is the source of truth; the `streak`
 * field is kept in sync on every toggle. See docs/AGENT_EXTRAS.md / AGENT_AI.md.
 */

import { toISODate } from "@/lib/utils/dates";
import { habitHypePrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/lib/ai/types";
import type { Habit } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO date key (YYYY-MM-DD, local) for a timestamp. */
export function dayKey(ts: number): string {
  return toISODate(ts);
}

export function completedOn(log: Record<string, boolean>, dateKey: string): boolean {
  return log[dateKey] === true;
}

/**
 * Consecutive completed days. If today isn't marked yet, the streak is still
 * alive from yesterday; otherwise it starts today and counts backwards.
 */
export function currentStreak(log: Record<string, boolean>, now = Date.now()): number {
  let cursor = now;
  if (!completedOn(log, dayKey(cursor))) cursor -= DAY_MS;
  let streak = 0;
  while (completedOn(log, dayKey(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}

/** Toggle today's completion and return a new habit with a synced streak. */
export function toggleCompletion(habit: Habit, now = Date.now()): Habit {
  const key = dayKey(now);
  const log = { ...habit.log, [key]: !completedOn(habit.log, key) };
  return { ...habit, log, streak: currentStreak(log, now) };
}

/** Last 7 days as booleans (oldest → today). */
export function weekLog(log: Record<string, boolean>, now = Date.now()): boolean[] {
  const days: boolean[] = [];
  for (let i = 6; i >= 0; i--) days.push(completedOn(log, dayKey(now - i * DAY_MS)));
  return days;
}

/** System + user messages for a one-sentence habit nudge. */
export function habitNudgeMessages(habit: Habit): ChatMessage[] {
  return [
    { role: "system", content: habitHypePrompt({ habit: habit.name, streak: habit.streak }) },
    { role: "user", content: "Give me a quick nudge." },
  ];
}
