import { describe, it, expect } from "vitest";
import type { FocusSession } from "@/types";
import { formatDuration, startOfWeek, weeklyFocusStat } from "@/lib/focus";

function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return { id: "s", start: 0, duration: 60, createdAt: 0, ...overrides };
}

describe("startOfWeek", () => {
  it("returns Monday 00:00 local", () => {
    // 2026-08-15 is a Saturday.
    const saturday = new Date(2026, 7, 15, 14, 30, 0).getTime();
    const monday = new Date(2026, 7, 10, 0, 0, 0).getTime();
    expect(startOfWeek(saturday)).toBe(monday);
  });
});

describe("weeklyFocusStat", () => {
  it("sums only sessions in the current week", () => {
    const monday = new Date(2026, 7, 10, 9, 0, 0).getTime();
    const tuesday = new Date(2026, 7, 11, 9, 0, 0).getTime();
    const lastWeek = new Date(2026, 7, 3, 9, 0, 0).getTime();
    const now = new Date(2026, 7, 15).getTime();

    const sessions = [
      session({ id: "a", start: monday, duration: 1500 }),
      session({ id: "b", start: tuesday, duration: 900 }),
      session({ id: "c", start: lastWeek, duration: 99999 }),
    ];
    const stat = weeklyFocusStat(sessions, now);
    expect(stat.sessions).toBe(2);
    expect(stat.totalSeconds).toBe(2400);
    expect(stat.totalMinutes).toBe(40);
  });
});

describe("formatDuration", () => {
  it("formats MM:SS", () => {
    expect(formatDuration(1500)).toBe("25:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(-5)).toBe("00:00");
  });
});
