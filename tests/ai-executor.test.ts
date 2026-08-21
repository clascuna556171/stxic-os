import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit, Note, SavingsGoal, TaskItem, Transaction, FinanceAccount } from "@/types";

const memoryStore = {
  savingsGoals: new Map<string, SavingsGoal>(),
  tasks: new Map<string, TaskItem>(),
  notes: new Map<string, Note>(),
  transactions: new Map<string, Transaction>(),
  accounts: new Map<string, FinanceAccount>(),
  habits: new Map<string, Habit>(),
};

vi.mock("@/lib/hydrate", () => ({
  listSavingsGoals: vi.fn(async () => ({ ok: true, data: Array.from(memoryStore.savingsGoals.values()) })),
  saveSavingsGoal: vi.fn(async (item: SavingsGoal) => {
    memoryStore.savingsGoals.set(item.id, item);
    return { ok: true, data: undefined };
  }),
  deleteSavingsGoal: vi.fn(async (id: string) => {
    memoryStore.savingsGoals.delete(id);
    return { ok: true, data: undefined };
  }),
  listTasks: vi.fn(async () => ({ ok: true, data: Array.from(memoryStore.tasks.values()) })),
  saveTask: vi.fn(async (item: TaskItem) => {
    memoryStore.tasks.set(item.id, item);
    return { ok: true, data: undefined };
  }),
  deleteTask: vi.fn(async (id: string) => {
    memoryStore.tasks.delete(id);
    return { ok: true, data: undefined };
  }),
  listNotes: vi.fn(async () => ({ ok: true, data: Array.from(memoryStore.notes.values()) })),
  saveNote: vi.fn(async (item: Note) => {
    memoryStore.notes.set(item.id, item);
    return { ok: true, data: undefined };
  }),
  deleteNote: vi.fn(async (id: string) => {
    memoryStore.notes.delete(id);
    return { ok: true, data: undefined };
  }),
  listTransactions: vi.fn(async () => ({ ok: true, data: Array.from(memoryStore.transactions.values()) })),
  saveTransaction: vi.fn(async (item: Transaction) => {
    memoryStore.transactions.set(item.id, item);
    return { ok: true, data: undefined };
  }),
  deleteTransaction: vi.fn(async (id: string) => {
    memoryStore.transactions.delete(id);
    return { ok: true, data: undefined };
  }),
  listAccounts: vi.fn(async () => ({ ok: true, data: Array.from(memoryStore.accounts.values()) })),
  saveAccount: vi.fn(async (item: FinanceAccount) => {
    memoryStore.accounts.set(item.id, item);
    return { ok: true, data: undefined };
  }),
  deleteAccount: vi.fn(async (id: string) => {
    memoryStore.accounts.delete(id);
    return { ok: true, data: undefined };
  }),
  listHabits: vi.fn(async () => ({ ok: true, data: Array.from(memoryStore.habits.values()) })),
  saveHabit: vi.fn(async (item: Habit) => {
    memoryStore.habits.set(item.id, item);
    return { ok: true, data: undefined };
  }),
  deleteHabit: vi.fn(async (id: string) => {
    memoryStore.habits.delete(id);
    return { ok: true, data: undefined };
  }),
}));

import { executeAiAction, undoAiAction } from "@/lib/ai/executor";
import {
  listHabits,
  listNotes,
  listSavingsGoals,
  listTasks,
  saveSavingsGoal,
} from "@/lib/hydrate";

beforeEach(() => {
  memoryStore.savingsGoals.clear();
  memoryStore.tasks.clear();
  memoryStore.notes.clear();
  memoryStore.transactions.clear();
  memoryStore.accounts.clear();
  memoryStore.habits.clear();
});

describe("executeAiAction — Savings Auto-Resolution", () => {
  it("automatically creates a General Savings goal when none exist", async () => {
    const res = await executeAiAction(
      { kind: "addToSavings", amount: 5000, currency: "PHP" },
      "Add 5000 at the savings",
      "PHP",
    );

    expect(res.ok).toBe(true);
    expect(res.described).toContain("General Savings");
    expect(res.itemHref).toBe("/income");

    const goalsRes = await listSavingsGoals();
    expect(goalsRes.ok).toBe(true);
    const created = goalsRes.ok ? goalsRes.data.find((g) => g.name === "General Savings") : null;
    expect(created).toBeDefined();
    expect(created?.saved).toBe(5000);
  });

  it("updates an existing savings goal when one exists", async () => {
    const existing: SavingsGoal = {
      id: "goal-1",
      name: "Emergency Fund",
      target: 50000,
      saved: 10000,
      currency: "PHP",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveSavingsGoal(existing);

    const res = await executeAiAction(
      { kind: "addToSavings", name: "Emergency Fund", amount: 5000, currency: "PHP" },
      "add 5k to Emergency Fund",
      "PHP",
    );

    expect(res.ok).toBe(true);
    const goalsRes = await listSavingsGoals();
    const updated = goalsRes.ok ? goalsRes.data.find((g) => g.id === "goal-1") : null;
    expect(updated?.saved).toBe(15000);

    // Test Undo
    if (res.snapshot) {
      const undoRes = await undoAiAction(res.snapshot);
      expect(undoRes.ok).toBe(true);
      const afterUndo = (await listSavingsGoals()).data?.find((g) => g.id === "goal-1");
      expect(afterUndo?.saved).toBe(10000);
    }
  });
});

describe("executeAiAction — Tasks & Completion", () => {
  it("creates a task and allows undo", async () => {
    const res = await executeAiAction(
      {
        kind: "task",
        title: "Submit physics report",
        priority: "P1",
        description: "Review PDF",
        type: "assignment",
      },
      "",
      "PHP",
    );

    expect(res.ok).toBe(true);
    expect(res.itemHref).toBe("/tasks");

    const tasksRes = await listTasks();
    const task = tasksRes.ok ? tasksRes.data.find((t) => t.title === "Submit physics report") : null;
    expect(task).toBeDefined();
    expect(task?.type).toBe("assignment");

    // Complete the task
    const compRes = await executeAiAction(
      { kind: "completeTask", query: "Submit physics report" },
      "",
      "PHP",
    );
    expect(compRes.ok).toBe(true);

    const tasksAfterComp = await listTasks();
    const completedTask = tasksAfterComp.data?.find((t) => t.title === "Submit physics report");
    expect(completedTask?.status).toBe("done");

    // Undo completion
    if (compRes.snapshot) {
      const undoRes = await undoAiAction(compRes.snapshot);
      expect(undoRes.ok).toBe(true);
      const restored = (await listTasks()).data?.find((t) => t.title === "Submit physics report");
      expect(restored?.status).toBe("todo");
    }
  });
});

describe("executeAiAction — Notes & Habits", () => {
  it("creates a note and handles undo", async () => {
    const res = await executeAiAction(
      { kind: "note", title: "Meeting Recap", content: "Discussed Q3 goals" },
      "",
      "PHP",
    );

    expect(res.ok).toBe(true);
    const notesRes = await listNotes();
    expect(notesRes.data?.some((n) => n.title === "Meeting Recap")).toBe(true);

    if (res.snapshot) {
      await undoAiAction(res.snapshot);
      const afterUndo = await listNotes();
      expect(afterUndo.data?.some((n) => n.title === "Meeting Recap")).toBe(false);
    }
  });

  it("creates and checks in a habit", async () => {
    const res = await executeAiAction(
      { kind: "habit", name: "Drink Water", emoji: "💧" },
      "",
      "PHP",
    );
    expect(res.ok).toBe(true);

    const habitsRes = await listHabits();
    const habit = habitsRes.data?.find((h) => h.name === "Drink Water");
    expect(habit).toBeDefined();

    const checkRes = await executeAiAction(
      { kind: "checkHabit", query: "Drink Water" },
      "",
      "PHP",
    );
    expect(checkRes.ok).toBe(true);

    const afterCheck = (await listHabits()).data?.find((h) => h.name === "Drink Water");
    expect(afterCheck?.streak).toBeGreaterThanOrEqual(1);
  });
});
