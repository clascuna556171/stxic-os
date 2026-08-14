import { describe, it, expect } from "vitest";
import type { TaskItem } from "@/types";
import { isOverdue, isDueOn, monthGrid, tasksOnDate } from "@/lib/tasks";

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "t",
    title: "Task",
    status: "todo",
    priority: "P2",
    type: "task",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("due-date checks", () => {
  it("flags non-done tasks due before today", () => {
    const now = new Date(2026, 7, 15).getTime(); // Aug 15 2026
    expect(isOverdue(task({ dueDate: new Date(2026, 7, 14).getTime() }), now)).toBe(true);
    expect(isOverdue(task({ dueDate: new Date(2026, 7, 15).getTime() }), now)).toBe(false);
    expect(isOverdue(task({ dueDate: new Date(2026, 7, 14).getTime(), status: "done" }), now)).toBe(
      false,
    );
  });

  it("matches tasks to a specific day", () => {
    const d = new Date(2026, 7, 15);
    expect(isDueOn(task({ dueDate: new Date(2026, 7, 15, 10).getTime() }), d)).toBe(true);
    expect(isDueOn(task({ dueDate: new Date(2026, 7, 16).getTime() }), d)).toBe(false);
    expect(isDueOn(task({}), d)).toBe(false);
  });
});

describe("monthGrid", () => {
  it("builds a Monday-first grid with full weeks", () => {
    const weeks = monthGrid(2026, 7); // Aug 2026
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // Aug 1 2026 is a Saturday; leading = (6 + 6) % 7 = 5 nulls.
    expect(weeks[0]![0]).toBeNull();
    expect(weeks[0]![5]).toEqual(new Date(2026, 7, 1));
    // All non-null cells are valid Aug dates.
    for (const week of weeks) for (const cell of week) if (cell) expect(cell.getMonth()).toBe(7);
  });
});

describe("tasksOnDate", () => {
  it("sorts by priority", () => {
    const d = new Date(2026, 7, 15);
    const list = [
      task({ id: "p2", title: "b", dueDate: d.getTime(), priority: "P2" }),
      task({ id: "p0", title: "a", dueDate: d.getTime(), priority: "P0" }),
    ];
    expect(tasksOnDate(list, d).map((t) => t.id)).toEqual(["p0", "p2"]);
  });
});
