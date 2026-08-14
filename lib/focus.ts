/**
 * Focus timer helpers — Pomodoro presets, weekly stats, duration formatting.
 * Pure and unit-tested.
 */

import type { FocusSession } from "@/types";

export type FocusMode = "focus" | "short" | "long";

export interface FocusPreset {
  id: FocusMode;
  label: string;
  defaultMinutes: number;
}

export const FOCUS_PRESETS: FocusPreset[] = [
  { id: "focus", label: "Focus", defaultMinutes: 25 },
  { id: "short", label: "Short break", defaultMinutes: 5 },
  { id: "long", label: "Long break", defaultMinutes: 15 },
];

export const DEFAULT_DURATIONS: Record<FocusMode, number> = {
  focus: 25,
  short: 5,
  long: 15,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the week (Monday, local) as a timestamp. */
export function startOfWeek(now: number): number {
  const d = new Date(now);
  const weekday = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weekday);
  return d.getTime();
}

export interface WeeklyFocusStat {
  totalSeconds: number;
  totalMinutes: number;
  sessions: number;
}

/** Aggregate focus sessions within the current Monday-start week. */
export function weeklyFocusStat(sessions: FocusSession[], now = Date.now()): WeeklyFocusStat {
  const start = startOfWeek(now);
  const end = start + 7 * DAY_MS;
  const week = sessions.filter((s) => s.start >= start && s.start < end);
  const totalSeconds = week.reduce((sum, s) => sum + s.duration, 0);
  return {
    totalSeconds,
    totalMinutes: Math.round(totalSeconds / 60),
    sessions: week.length,
  };
}

/** "MM:SS" from seconds. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
