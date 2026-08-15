import { describe, it, expect } from "vitest";
import {
  buildDigestContext,
  digestMessages,
  parseTopPriorities,
  stripJsonBlock,
} from "@/lib/ai/digest";
import type { Habit, TaskItem } from "@/types";

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

function habit(streak: number): Habit {
  const log: Record<string, boolean> = {};
  for (let i = 0; i < streak; i++)
    log[new Date(NOW - i * 86_400_000).toISOString().slice(0, 10)] = true;
  return { id: "h", name: "Run", streak, log, createdAt: NOW };
}

describe("buildDigestContext", () => {
  it("summarizes tasks, habits and focus into prompt strings", () => {
    const ctx = buildDigestContext({
      tasks: [task({ title: "Lab report" }), task({ title: "Done thing", status: "done" })],
      habits: [habit(3)],
      focusMinutes: 45,
      now: NOW,
    });
    expect(ctx.tasks).toContain("Lab report");
    expect(ctx.tasks).not.toContain("Done thing");
    expect(ctx.habits).toContain("3-day streak");
    expect(ctx.focus).toContain("45m");
    expect(ctx.date).toBe(new Date(NOW).toDateString());
  });
});

describe("digestMessages", () => {
  it("prepends the daily-digest system prompt", () => {
    const msgs = digestMessages({ tasks: [], habits: [], focusMinutes: 0, now: NOW });
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[0]!.content).toContain("top3Priorities");
  });
});

describe("parseTopPriorities", () => {
  it("extracts the priorities array from markdown output", () => {
    const text = `Here is your briefing.\n\n- do A\n- do B\n\n\`\`\`json\n{"top3Priorities":["A","B","C"]}\n\`\`\``;
    expect(parseTopPriorities(text)).toEqual(["A", "B", "C"]);
  });

  it("returns empty when no priorities present", () => {
    expect(parseTopPriorities("no json here")).toEqual([]);
  });
});

describe("stripJsonBlock", () => {
  it("removes a fenced or unfenced trailing JSON block", () => {
    const fenced = `Briefing.\n\`\`\`json\n{"top3Priorities":["A","B"]}\n\`\`\``;
    expect(stripJsonBlock(fenced)).toBe("Briefing.");

    const bare = `Briefing.\n{"top3Priorities":["A","B"]}`;
    expect(stripJsonBlock(bare)).toBe("Briefing.");
  });
});
