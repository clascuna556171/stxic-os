import { describe, expect, it } from "vitest";
import { clampMove, clampResize, compact, GRID_COLS } from "@/lib/dashboard/grid";
import { defaultLayout, WIDGETS } from "@/lib/dashboard/widgets";
import {
  netByMonth,
  startOfWeekFocusDays,
} from "@/components/features/dashboard/bento-helpers";
import type { DashboardWidget, FocusSession, Habit, TaskItem, Transaction } from "@/types";

describe("clampMove", () => {
  it("keeps x within the grid", () => {
    const w: DashboardWidget = { id: "a", x: 0, y: 0, w: 4, h: 2 };
    expect(clampMove(w, -5, 0).x).toBe(0);
    expect(clampMove(w, 99, 0).x).toBe(GRID_COLS - 4);
  });

  it("never allows negative y", () => {
    const w: DashboardWidget = { id: "a", x: 0, y: 2, w: 4, h: 2 };
    expect(clampMove(w, 0, -99).y).toBe(0);
  });
});

describe("clampResize", () => {
  it("clamps width to remaining columns", () => {
    const w: DashboardWidget = { id: "a", x: 8, y: 0, w: 4, h: 2 };
    expect(clampResize(w, 99, 0).w).toBe(GRID_COLS - 8);
  });

  it("keeps a minimum size of 1", () => {
    const w: DashboardWidget = { id: "a", x: 0, y: 0, w: 4, h: 2 };
    expect(clampResize(w, -99, -99).w).toBe(1);
    expect(clampResize(w, -99, -99).h).toBe(1);
  });
});

describe("compact", () => {
  it("pushes a widget below the one above it when they overlap", () => {
    const items: DashboardWidget[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 0, w: 6, h: 2 },
    ];
    const out = compact(items);
    expect(out.find((w) => w.id === "a")!.y).toBe(0);
    expect(out.find((w) => w.id === "b")!.y).toBe(2);
  });

  it("leaves side-by-side widgets alone", () => {
    const items: DashboardWidget[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 6, y: 0, w: 6, h: 2 },
    ];
    const out = compact(items);
    expect(out.find((w) => w.id === "b")!.y).toBe(0);
  });
});

describe("defaultLayout", () => {
  it("contains every non-opt-in widget with sane bounds", () => {
    const layout = defaultLayout();
    const optIn = new Set(["obsidianGraph"]);
    expect(layout.map((w) => w.id).sort()).toEqual(
      WIDGETS.map((w) => w.id)
        .filter((id) => !optIn.has(id))
        .sort(),
    );
    for (const w of layout) {
      expect(w.w).toBeGreaterThanOrEqual(1);
      expect(w.w).toBeLessThanOrEqual(GRID_COLS);
      expect(w.x + w.w).toBeLessThanOrEqual(GRID_COLS);
      expect(w.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("BentoOverview helpers", () => {
  it("netByMonth builds 6 consecutive monthly buckets and sums income/expense", () => {
    const fixedNow = new Date(2026, 9, 15).getTime(); // Oct 2026
    const txs: Transaction[] = [
      {
        id: "t1",
        type: "income",
        label: "Salary",
        amount: 5000,
        currency: "PHP",
        category: "Salary",
        date: fixedNow,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
      {
        id: "t2",
        type: "expense",
        label: "Rent",
        amount: 1800,
        currency: "PHP",
        category: "Housing",
        date: fixedNow,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    ];
    const series = netByMonth(txs, 6, fixedNow);
    expect(series).toHaveLength(6);
    const last = series[series.length - 1]!;
    expect(last.key).toBe("2026-10");
    expect(last.income).toBe(5000);
    expect(last.expense).toBe(1800);
  });

  it("startOfWeekFocusDays returns 7 Mon-Sun buckets with focus minutes and habit/task scores", () => {
    const fixedNow = new Date(2026, 9, 21, 14, 0, 0).getTime(); // Wed Oct 21 2026
    const sessions: FocusSession[] = [
      {
        id: "f1",
        start: fixedNow,
        duration: 30 * 60,
        createdAt: fixedNow,
      },
    ];
    const tasks: TaskItem[] = [
      {
        id: "task1",
        title: "Done task",
        status: "done",
        priority: "P1",
        type: "task",
        createdAt: fixedNow,
        updatedAt: fixedNow,
      },
    ];
    const habits: Habit[] = [
      {
        id: "h1",
        name: "Run",
        streak: 1,
        log: { "2026-10-21": true },
        createdAt: fixedNow,
      },
    ];
    const days = startOfWeekFocusDays(sessions, tasks, habits, fixedNow);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    const wed = days[2]!;
    expect(wed.isToday).toBe(true);
    expect(wed.minutes).toBe(30);
    expect(wed.habitsDone).toBe(1);
    expect(wed.tasksUpdated).toBe(1);
    expect(wed.score).toBe(30 + 15 + 20);
  });
});
