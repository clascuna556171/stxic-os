import { describe, expect, it } from "vitest";
import { buildTermGrid, startOfWeekMonday, termItemsForWeek } from "@/lib/semester";
import type { BlackboardEvent, TaskItem } from "@/types";

const MON = new Date(2026, 7, 17).getTime(); // Monday 2026-08-17 (local)
const DAY = 24 * 60 * 60 * 1000;

function task(over: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "t",
    title: "Task",
    status: "todo",
    priority: "P0",
    type: "task",
    createdAt: MON,
    updatedAt: MON,
    ...over,
  };
}

function event(uid: string, dtstart: number): BlackboardEvent {
  return { uid, summary: `Event ${uid}`, dtstart, dtend: dtstart };
}

describe("startOfWeekMonday", () => {
  it("rolls a Saturday back to Monday at midnight", () => {
    const sat = new Date(2026, 7, 15).getTime(); // Saturday
    const monday = new Date(startOfWeekMonday(sat));
    expect(monday.getDay()).toBe(1);
    expect(monday.getHours()).toBe(0);
    expect(monday.getTime()).toBeLessThanOrEqual(sat);
  });

  it("keeps an actual Monday unchanged", () => {
    expect(startOfWeekMonday(MON)).toBe(MON);
  });
});

describe("buildTermGrid", () => {
  it("builds consecutive Monday-start weeks", () => {
    const weeks = buildTermGrid(MON, 3);
    expect(weeks).toHaveLength(3);
    expect(weeks[0]!.start).toBe(MON);
    expect(weeks[1]!.start).toBe(MON + 7 * DAY);
    expect(weeks[0]!.end).toBe(weeks[1]!.start);
  });
});

describe("termItemsForWeek", () => {
  const week = { start: MON, end: MON + 7 * DAY };

  it("buckets tasks and blackboard events into the right week", () => {
    const items = termItemsForWeek(
      week,
      [
        task({ id: "a", title: "Due now", dueDate: MON + DAY }),
        task({ id: "b", title: "Next week", dueDate: MON + 8 * DAY }),
        task({ id: "c", title: "Done", dueDate: MON + DAY, status: "done" }),
      ],
      [event("e1", MON + 2 * DAY)],
      MON,
    );
    expect(items.map((i) => i.title)).toEqual(["Due now", "Event e1"]);
  });

  it("tags sources and sorts by due date", () => {
    const items = termItemsForWeek(
      week,
      [task({ id: "a", dueDate: MON + 3 * DAY })],
      [event("e1", MON + DAY)],
      MON,
    );
    expect(items[0]!.source).toBe("blackboard");
    expect(items[0]!.risk).toBeDefined();
    expect(items[1]!.source).toBe("task");
    expect(items[1]!.priority).toBe("P0");
  });

  it("returns empty when nothing is due that week", () => {
    expect(termItemsForWeek(week, [], [], MON)).toEqual([]);
  });
});
