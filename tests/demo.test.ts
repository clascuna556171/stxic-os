import { describe, it, expect } from "vitest";
import { buildDemoSeed } from "@/lib/demo/seed";

describe("demo seed data", () => {
  it("produces a populated, non-empty sample set", () => {
    const seed = buildDemoSeed(new Date(2026, 7, 15).getTime());
    expect(seed.vault.length).toBeGreaterThanOrEqual(3);
    expect(seed.notes.length).toBeGreaterThanOrEqual(3);
    expect(seed.tasks.length).toBeGreaterThanOrEqual(4);
    expect(seed.transactions.length).toBeGreaterThanOrEqual(6);
    expect(seed.accounts.length).toBeGreaterThanOrEqual(3);
    expect(seed.savingsGoals.length).toBeGreaterThanOrEqual(2);
    expect(seed.habits.length).toBeGreaterThanOrEqual(1);
    expect(seed.focusSessions.length).toBeGreaterThanOrEqual(5);
  });

  it("spans all task statuses and priorities", () => {
    const seed = buildDemoSeed();
    const statuses = new Set(seed.tasks.map((t) => t.status));
    const priorities = new Set(seed.tasks.map((t) => t.priority));
    expect(statuses.has("todo")).toBe(true);
    expect(statuses.has("in_progress")).toBe(true);
    expect(statuses.has("done")).toBe(true);
    expect(priorities.has("P0")).toBe(true);
    expect(priorities.has("P1")).toBe(true);
    expect(priorities.has("P2")).toBe(true);
  });

  it("generates unique ids", () => {
    const seed = buildDemoSeed();
    const ids = [
      ...seed.vault,
      ...seed.notes,
      ...seed.tasks,
      ...seed.transactions,
      ...seed.accounts,
      ...seed.savingsGoals,
      ...seed.focusSessions,
    ].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only supported currencies and covers both transaction types", () => {
    const seed = buildDemoSeed();
    for (const t of seed.transactions) expect(["PHP", "USD", "EUR", "JPY"]).toContain(t.currency);
    expect(new Set(seed.transactions.map((t) => t.type))).toEqual(new Set(["income", "expense"]));
  });
});
