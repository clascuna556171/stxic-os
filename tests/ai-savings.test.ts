import { describe, expect, it } from "vitest";
import type { SavingsGoal } from "@/types";
import { resolveSavingsTarget, savingsHint } from "@/lib/ai/savings";

function goal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g",
    name: "Emergency fund",
    target: 20000,
    saved: 5000,
    currency: "PHP",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const topUp = (name?: string) => ({ kind: "addToSavings" as const, name, amount: 5000, currency: "PHP" as const });

describe("resolveSavingsTarget", () => {
  it("returns none with defaultName when there are no goals at all", () => {
    expect(resolveSavingsTarget(topUp(), "add 5k at the savings", [])).toEqual({
      status: "none",
      defaultName: "General Savings",
    });
  });

  it("matches an explicit goal name exactly", () => {
    const a = goal({ id: "a", name: "Laptop" });
    const b = goal({ id: "b", name: "Emergency fund" });
    expect(resolveSavingsTarget(topUp("emergency fund"), "add 5k to emergency fund", [a, b])).toEqual({
      status: "ok",
      goal: b,
    });
  });

  it("matches a partial goal name", () => {
    const a = goal({ id: "a", name: "New laptop fund" });
    expect(resolveSavingsTarget(topUp("laptop"), "add 5k to laptop", [a])).toEqual({
      status: "ok",
      goal: a,
    });
  });

  it("fuzzy-matches a goal mentioned anywhere in the message", () => {
    const a = goal({ id: "a", name: "Emergency fund" });
    const b = goal({ id: "b", name: "Trip" });
    expect(resolveSavingsTarget(topUp(undefined), "add 5k to my trip savings", [a, b])).toEqual({
      status: "ok",
      goal: b,
    });
  });

  it("uses the only goal when there is exactly one", () => {
    const only = goal({ id: "only" });
    expect(resolveSavingsTarget(topUp(), "add 5k at the savings", [only])).toEqual({
      status: "ok",
      goal: only,
    });
  });

  it("asks which goal when several exist with no hint", () => {
    const res = resolveSavingsTarget(
      topUp(),
      "add 5k at the savings",
      [goal({ id: "a", name: "Laptop" }), goal({ id: "b", name: "Trip" })],
    );
    expect(res.status).toBe("candidates");
  });
});

describe("savingsHint", () => {
  it("suggests creating a goal when none exist", () => {
    expect(savingsHint([])).toContain("add savings goal:");
  });

  it("lists the goals to pick from", () => {
    const hint = savingsHint([goal({ name: "Laptop" }), goal({ name: "Trip" })]);
    expect(hint).toContain("Laptop");
    expect(hint).toContain("Trip");
    expect(hint).toContain("add 5k to Laptop");
  });
});
