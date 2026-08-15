import { describe, expect, it } from "vitest";
import { buildPlannerContext, plannerMessages } from "@/lib/ai/planner";
import type { TaskItem } from "@/types";

const NOW = new Date(2026, 7, 15, 9, 0, 0).getTime();

function task(over: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "t",
    title: "Lab report",
    status: "todo",
    priority: "P0",
    type: "task",
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

describe("buildPlannerContext", () => {
  it("lists open tasks with priority, type, and due date", () => {
    const ctx = buildPlannerContext({
      tasks: [
        task({ title: "Lab report", type: "assignment", dueDate: NOW + 86_400_000 }),
        task({ id: "2", title: "Read ch.4", status: "done" }),
      ],
      hoursPerDay: 2,
      studyDays: "weekdays",
      now: NOW,
    });
    expect(ctx.tasks).toContain("Lab report");
    expect(ctx.tasks).toContain("[assignment]");
    expect(ctx.tasks).toContain("due");
    expect(ctx.tasks).not.toContain("Read ch.4");
  });

  it("sorts by priority, then due date", () => {
    const ctx = buildPlannerContext({
      tasks: [
        task({ id: "p2", title: "P2 task", priority: "P2" }),
        task({ id: "p1", title: "P1 task", priority: "P1" }),
        task({ id: "p0", title: "P0 task", priority: "P0" }),
      ],
      hoursPerDay: 2,
      studyDays: "weekdays",
      now: NOW,
    });
    expect(ctx.tasks.indexOf("P0 task")).toBeLessThan(ctx.tasks.indexOf("P1 task"));
    expect(ctx.tasks.indexOf("P1 task")).toBeLessThan(ctx.tasks.indexOf("P2 task"));
  });

  it("falls back to 'none' with no open tasks", () => {
    const ctx = buildPlannerContext({
      tasks: [task({ status: "done" })],
      hoursPerDay: 3,
      studyDays: "everyday",
      now: NOW,
    });
    expect(ctx.tasks).toBe("none");
  });

  it("describes weekday availability", () => {
    const ctx = buildPlannerContext({
      tasks: [],
      hoursPerDay: 2,
      studyDays: "weekdays",
      now: NOW,
    });
    expect(ctx.available).toContain("2 hours/day");
    expect(ctx.available).toContain("Mon-Fri");
  });

  it("describes everyday availability", () => {
    const ctx = buildPlannerContext({
      tasks: [],
      hoursPerDay: 4,
      studyDays: "everyday",
      now: NOW,
    });
    expect(ctx.available).toContain("4 hours/day");
    expect(ctx.available).toContain("every day");
  });
});

describe("plannerMessages", () => {
  it("prepends the study-planner system prompt and states today", () => {
    const msgs = plannerMessages({ tasks: [], hoursPerDay: 2, studyDays: "weekdays", now: NOW });
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[0]!.content).toContain("day-by-day");
    expect(msgs[1]!.role).toBe("user");
    expect(msgs[1]!.content).toContain(new Date(NOW).toDateString());
  });
});
