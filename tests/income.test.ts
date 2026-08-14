import { describe, it, expect } from "vitest";
import type { IncomeEntry } from "@/types";
import {
  groupByMonth,
  incomeToCsv,
  monthKey,
  monthLabel,
  monthlyTotals,
  sumEntries,
} from "@/lib/income";

function entry(overrides: Partial<IncomeEntry> = {}): IncomeEntry {
  return {
    id: "e",
    label: "Pay",
    amount: 100,
    currency: "PHP",
    category: "Salary",
    date: new Date(2026, 7, 10).getTime(),
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("monthKey / monthLabel", () => {
  it("keys and labels months", () => {
    const ts = new Date(2026, 7, 10).getTime();
    expect(monthKey(ts)).toBe("2026-08");
    expect(monthLabel("2026-08")).toBe("Aug 26");
  });
});

describe("monthlyTotals", () => {
  it("sums and sorts by month", () => {
    const list = [
      entry({ id: "a", amount: 100, date: new Date(2026, 7, 1).getTime() }),
      entry({ id: "b", amount: 50, date: new Date(2026, 6, 1).getTime() }),
      entry({ id: "c", amount: 25, date: new Date(2026, 7, 15).getTime() }),
    ];
    const totals = monthlyTotals(list);
    expect(totals.map((t) => t.key)).toEqual(["2026-07", "2026-08"]);
    expect(totals[1]!.total).toBe(125);
  });
});

describe("groupByMonth", () => {
  it("groups newest month first", () => {
    const list = [
      entry({ id: "a", date: new Date(2026, 6, 1).getTime() }),
      entry({ id: "b", date: new Date(2026, 7, 1).getTime() }),
    ];
    const groups = groupByMonth(list);
    expect(groups.map((g) => g.key)).toEqual(["2026-08", "2026-07"]);
  });

  it("sums group totals", () => {
    const list = [
      entry({ id: "a", amount: 100, date: new Date(2026, 7, 1).getTime() }),
      entry({ id: "b", amount: 50, date: new Date(2026, 7, 15).getTime() }),
    ];
    expect(groupByMonth(list)[0]!.total).toBe(150);
  });
});

describe("sumEntries", () => {
  it("filters by month", () => {
    const list = [
      entry({ id: "a", amount: 100, date: new Date(2026, 7, 1).getTime() }),
      entry({ id: "b", amount: 30, date: new Date(2026, 6, 1).getTime() }),
    ];
    expect(sumEntries(list)).toBe(130);
    expect(sumEntries(list, "2026-08")).toBe(100);
  });
});

describe("incomeToCsv", () => {
  it("produces flat rows", () => {
    const rows = incomeToCsv([entry()]);
    expect(rows[0]).toMatchObject({
      label: "Pay",
      amount: 100,
      currency: "PHP",
      category: "Salary",
    });
  });
});
