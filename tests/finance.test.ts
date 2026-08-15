import { describe, it, expect } from "vitest";
import type { FinanceAccount, IncomeEntry, SavingsGoal, Transaction } from "@/types";
import {
  accountTotalsByCurrency,
  goalPercent,
  groupByMonth,
  migrateIncomeToTransactions,
  monthKey,
  monthLabel,
  monthlyTotals,
  netByMonth,
  savingsTotalsByCurrency,
  sumTransactions,
  transactionToCsv,
} from "@/lib/finance";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t",
    type: "income",
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

function account(overrides: Partial<FinanceAccount> = {}): FinanceAccount {
  return {
    id: "a",
    name: "GCash",
    kind: "e-wallet",
    currency: "PHP",
    balance: 500,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function goal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
  return {
    id: "g",
    name: "Fund",
    target: 1000,
    saved: 250,
    currency: "PHP",
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
      tx({ id: "a", amount: 100, date: new Date(2026, 7, 1).getTime() }),
      tx({ id: "b", amount: 50, date: new Date(2026, 6, 1).getTime() }),
      tx({ id: "c", amount: 25, date: new Date(2026, 7, 15).getTime() }),
    ];
    const totals = monthlyTotals(list);
    expect(totals.map((t) => t.key)).toEqual(["2026-07", "2026-08"]);
    expect(totals[1]!.total).toBe(125);
  });

  it("filters by type", () => {
    const list = [
      tx({ type: "income", amount: 100 }),
      tx({ type: "expense", amount: 40 }),
    ];
    expect(monthlyTotals(list, "income")[0]!.total).toBe(100);
    expect(monthlyTotals(list, "expense")[0]!.total).toBe(40);
  });
});

describe("netByMonth", () => {
  it("computes income, expense and net per month", () => {
    const list = [
      tx({ type: "income", amount: 300 }),
      tx({ type: "expense", amount: 80 }),
      tx({ type: "expense", amount: 20 }),
    ];
    const months = netByMonth(list);
    expect(months).toHaveLength(1);
    expect(months[0]).toMatchObject({ income: 300, expense: 100, net: 200 });
  });
});

describe("groupByMonth", () => {
  it("groups newest month first", () => {
    const list = [
      tx({ id: "a", date: new Date(2026, 6, 1).getTime() }),
      tx({ id: "b", date: new Date(2026, 7, 1).getTime() }),
    ];
    const groups = groupByMonth(list);
    expect(groups.map((g) => g.key)).toEqual(["2026-08", "2026-07"]);
  });

  it("nets group totals", () => {
    const list = [
      tx({ type: "income", amount: 100 }),
      tx({ type: "expense", amount: 40 }),
    ];
    expect(groupByMonth(list)[0]!.total).toBe(60);
  });
});

describe("sumTransactions", () => {
  it("filters by type and month", () => {
    const list = [
      tx({ id: "a", type: "income", amount: 100, date: new Date(2026, 7, 1).getTime() }),
      tx({ id: "b", type: "expense", amount: 30, date: new Date(2026, 7, 2).getTime() }),
      tx({ id: "c", type: "expense", amount: 20, date: new Date(2026, 6, 1).getTime() }),
    ];
    expect(sumTransactions(list)).toBe(150);
    expect(sumTransactions(list, "expense")).toBe(50);
    expect(sumTransactions(list, undefined, "2026-08")).toBe(130);
  });
});

describe("transactionToCsv", () => {
  it("produces flat rows with type", () => {
    const rows = transactionToCsv([tx()]);
    expect(rows[0]).toMatchObject({
      type: "income",
      label: "Pay",
      amount: 100,
      currency: "PHP",
      category: "Salary",
    });
  });
});

describe("accountTotalsByCurrency", () => {
  it("sums balances per currency", () => {
    const map = accountTotalsByCurrency([
      account({ balance: 500 }),
      account({ balance: 250 }),
      account({ balance: 100, currency: "USD" }),
    ]);
    expect(map.get("PHP")).toBe(750);
    expect(map.get("USD")).toBe(100);
  });
});

describe("goalPercent / savingsTotalsByCurrency", () => {
  it("clamps progress 0–100 and handles zero target", () => {
    expect(goalPercent(goal())).toBe(25);
    expect(goalPercent(goal({ saved: 2000 }))).toBe(100);
    expect(goalPercent(goal({ target: 0 }))).toBe(0);
  });

  it("aggregates across goals per currency", () => {
    const map = savingsTotalsByCurrency([
      goal({ saved: 250, target: 1000 }),
      goal({ saved: 250, target: 1000 }),
      goal({ saved: 10, target: 100, currency: "USD" }),
    ]);
    expect(map.get("PHP")).toMatchObject({ saved: 500, target: 2000, percent: 25 });
    expect(map.get("USD")?.percent).toBe(10);
  });
});

describe("migrateIncomeToTransactions", () => {
  it("maps legacy income entries to income transactions", () => {
    const entry: IncomeEntry = {
      id: "e1",
      label: "Pay",
      amount: 500,
      currency: "PHP",
      category: "Salary",
      date: 12345,
      createdAt: 1,
      updatedAt: 2,
    };
    const migrated = migrateIncomeToTransactions([entry]);
    expect(migrated[0]).toMatchObject({
      id: "e1",
      type: "income",
      label: "Pay",
      amount: 500,
      category: "Salary",
    });
  });
});
