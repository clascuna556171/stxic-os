import { describe, it, expect } from "vitest";
import { currentStreak, dayKey, toggleCompletion, weekLog, habitNudgeMessages } from "@/lib/habits";
import { toISODate } from "@/lib/utils/dates";
import type { Habit } from "@/types";

const NOW = new Date(2026, 7, 15, 12, 0, 0).getTime(); // 2026-08-15 (Saturday)

function habit(log: Record<string, boolean>): Habit {
  return { id: "h", name: "Run", streak: 0, log, createdAt: NOW };
}

describe("dayKey", () => {
  it("returns a local ISO date", () => {
    expect(dayKey(NOW)).toBe("2026-08-15");
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    const log = {
      [toISODate(NOW)]: true,
      [toISODate(NOW - 86_400_000)]: true,
      [toISODate(NOW - 2 * 86_400_000)]: true,
    };
    expect(currentStreak(log, NOW)).toBe(3);
  });

  it("stays alive from yesterday when today is unmarked", () => {
    const log = {
      [toISODate(NOW - 86_400_000)]: true,
      [toISODate(NOW - 2 * 86_400_000)]: true,
    };
    expect(currentStreak(log, NOW)).toBe(2);
  });

  it("returns 0 when there is a gap", () => {
    const log = {
      [toISODate(NOW - 2 * 86_400_000)]: true, // day before yesterday only
    };
    expect(currentStreak(log, NOW)).toBe(0);
  });
});

describe("toggleCompletion", () => {
  it("marks today done and sets streak", () => {
    const h = habit({ [toISODate(NOW - 86_400_000)]: true });
    const next = toggleCompletion(h, NOW);
    expect(next.log[toISODate(NOW)]).toBe(true);
    expect(next.streak).toBe(2);
  });

  it("unmarks today and recomputes streak", () => {
    const h = habit({ [toISODate(NOW)]: true, [toISODate(NOW - 86_400_000)]: true });
    const next = toggleCompletion(h, NOW);
    expect(next.log[toISODate(NOW)]).toBe(false);
    expect(next.streak).toBe(1);
  });

  it("does not mutate the input", () => {
    const h = habit({});
    toggleCompletion(h, NOW);
    expect(h.log).toEqual({});
  });
});

describe("weekLog", () => {
  it("returns 7 booleans oldest-first", () => {
    const log = { [toISODate(NOW)]: true };
    const week = weekLog(log, NOW);
    expect(week).toHaveLength(7);
    expect(week[6]).toBe(true);
    expect(week[0]).toBe(false);
  });
});

describe("habitNudgeMessages", () => {
  it("prepends a habit-hype system prompt", () => {
    const msgs = habitNudgeMessages(habit({}));
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[0]!.content).toContain("Run");
  });
});
