import { describe, expect, it } from "vitest";
import {
  describeAction,
  enrichTaskDescription,
  parseActionFromLlmResponse,
  parseAiAction,
} from "@/lib/ai/actions";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();

describe("parseAiAction — tasks", () => {
  it("add task with a colon", () => {
    const action = parseAiAction("add task: Go to the gym", "PHP", NOW);
    expect(action).toMatchObject({
      kind: "task",
      title: "Go to the gym",
      priority: "P2",
    });
    expect(action).not.toBeNull();
  });

  it("handles 'Add a new task like: …'", () => {
    const action = parseAiAction("Add a new task like: Go to the gym", "PHP", NOW);
    expect(action).toMatchObject({ kind: "task", title: "Go to the gym" });
  });

  it("strips quotes around the title", () => {
    expect(parseAiAction("Add new task called 'Update UI'", "PHP", NOW)).toMatchObject({
      kind: "task",
      title: "Update UI",
    });
  });

  it("remind me to …", () => {
    expect(parseAiAction("remind me to submit the report", "PHP", NOW)).toMatchObject({
      kind: "task",
      title: "submit the report",
    });
  });

  it("parses priority suffix", () => {
    expect(parseAiAction("add task: fix bug P1", "PHP", NOW)).toMatchObject({
      kind: "task",
      title: "fix bug",
      priority: "P1",
    });
  });

  it("parses priority prefix", () => {
    expect(parseAiAction("add P0 task: outage", "PHP", NOW)).toMatchObject({
      kind: "task",
      title: "outage",
      priority: "P0",
    });
  });

  it("parses due tomorrow", () => {
    const action = parseAiAction("create task: buy milk tomorrow", "PHP", NOW);
    expect(action).toMatchObject({ kind: "task", title: "buy milk" });
    expect((action as { dueDate?: number }).dueDate).toBe(NOW + 86_400_000);
  });

  it("parses assignment type", () => {
    const action = parseAiAction("create assignment: CS101 Project due tomorrow", "PHP", NOW);
    expect(action).toMatchObject({ kind: "task", type: "assignment" });
  });
});

describe("parseAiAction — complete task", () => {
  it("parses 'mark task as done'", () => {
    expect(parseAiAction("mark task Math Homework as done", "PHP", NOW)).toEqual({
      kind: "completeTask",
      query: "Math Homework",
    });
  });

  it("parses 'complete task: CS Project'", () => {
    expect(parseAiAction("complete task: CS Project", "PHP", NOW)).toEqual({
      kind: "completeTask",
      query: "CS Project",
    });
  });
});

describe("parseAiAction — habits", () => {
  it("parses habit creation with emoji", () => {
    expect(parseAiAction("create habit 📚 Read 20 pages", "PHP", NOW)).toEqual({
      kind: "habit",
      name: "Read 20 pages",
      emoji: "📚",
    });
  });

  it("parses habit check-in", () => {
    expect(parseAiAction("check off habit Read 20 pages", "PHP", NOW)).toEqual({
      kind: "checkHabit",
      query: "Read 20 pages",
    });
  });
});

describe("parseAiAction — expenses", () => {
  it("add expense with amount", () => {
    expect(parseAiAction("log expense lunch 250", "PHP", NOW)).toEqual({
      kind: "expense",
      label: "lunch",
      amount: 250,
      currency: "PHP",
      category: "Food",
    });
  });

  it("spent <amount> on <thing>", () => {
    expect(parseAiAction("spent 500 on groceries", "PHP", NOW)).toMatchObject({
      kind: "expense",
      label: "groceries",
      amount: 500,
      category: "Food",
    });
  });

  it("detects a currency", () => {
    expect(parseAiAction("spent $20 on coffee", "PHP", NOW)).toMatchObject({
      kind: "expense",
      amount: 20,
      currency: "USD",
      category: "Food",
    });
  });

  it("guesses a transport category", () => {
    expect(parseAiAction("log expense jeepney fare 15", "PHP", NOW)).toMatchObject({
      kind: "expense",
      category: "Transport",
    });
  });

  it("falls through when no amount is present", () => {
    expect(parseAiAction("log expense groceries", "PHP", NOW)).toBeNull();
  });
});

describe("parseAiAction — income", () => {
  it("record income with amount", () => {
    expect(parseAiAction("record income 3000 tutoring", "PHP", NOW)).toEqual({
      kind: "income",
      label: "tutoring",
      amount: 3000,
      currency: "PHP",
      category: "Freelance",
    });
  });

  it("earned <amount>", () => {
    expect(parseAiAction("earned 1500 from freelance project", "PHP", NOW)).toMatchObject({
      kind: "income",
      label: "freelance project",
      amount: 1500,
      category: "Freelance",
    });
  });
});

describe("parseAiAction — notes", () => {
  it("create note", () => {
    expect(parseAiAction("create note: reading list", "PHP", NOW)).toEqual({
      kind: "note",
      title: "reading list",
      content: "",
    });
  });

  it("note with content", () => {
    expect(parseAiAction("add note: meeting notes — talk about the roadmap", "PHP", NOW)).toMatchObject({
      kind: "note",
      title: "meeting notes",
      content: "talk about the roadmap",
    });
  });
});

describe("parseAiAction — savings goals", () => {
  it("add savings goal with an explicit target", () => {
    expect(parseAiAction("add savings goal: new laptop target 60000", "PHP", NOW)).toEqual({
      kind: "savingsGoal",
      name: "new laptop",
      target: 60000,
      saved: 0,
      currency: "PHP",
      deadline: undefined,
    });
  });

  it("uses the trailing number as the target", () => {
    expect(parseAiAction("set savings goal emergency fund 20000", "PHP", NOW)).toMatchObject({
      kind: "savingsGoal",
      name: "emergency fund",
      target: 20000,
    });
  });
});

describe("parseAiAction — accounts", () => {
  it("add an account with a balance", () => {
    expect(parseAiAction("add account: GCash 2500", "PHP", NOW)).toEqual({
      kind: "account",
      name: "GCash",
      accountKind: "e-wallet",
      currency: "PHP",
      balance: 2500,
    });
  });

  it("guesses a debit card kind", () => {
    expect(parseAiAction("add card: BPI Debit 8500", "PHP", NOW)).toMatchObject({
      kind: "account",
      name: "BPI Debit",
      accountKind: "debit",
      balance: 8500,
    });
  });
});

describe("parseAiAction — add to savings", () => {
  it("parses 'Add 5k at the savings' with a k-suffix", () => {
    expect(parseAiAction("Add 5k at the savings", "PHP", NOW)).toEqual({
      kind: "addToSavings",
      name: undefined,
      amount: 5000,
      currency: "PHP",
    });
  });

  it("parses 'Add 5000 at the savings' with standard integer", () => {
    expect(parseAiAction("Add 5000 at the savings", "PHP", NOW)).toEqual({
      kind: "addToSavings",
      name: undefined,
      amount: 5000,
      currency: "PHP",
    });
  });

  it("parses deposits into savings", () => {
    expect(parseAiAction("deposit 2k into my savings", "PHP", NOW)).toMatchObject({
      kind: "addToSavings",
      amount: 2000,
    });
  });

  it("captures an optional goal name", () => {
    expect(parseAiAction("add 1.5k to savings for laptop", "PHP", NOW)).toEqual({
      kind: "addToSavings",
      name: "laptop",
      amount: 1500,
      currency: "PHP",
    });
  });

  it("supports top-up phrasing with the amount last", () => {
    expect(parseAiAction("top up savings with 500", "PHP", NOW)).toMatchObject({
      kind: "addToSavings",
      amount: 500,
    });
  });
});

describe("parseAiAction — k/m amounts everywhere", () => {
  it("expands k in expenses", () => {
    expect(parseAiAction("log expense lunch 1.2k", "PHP", NOW)).toMatchObject({
      kind: "expense",
      amount: 1200,
      label: "lunch",
    });
  });

  it("expands k in income", () => {
    expect(parseAiAction("record income 3k tutoring", "PHP", NOW)).toMatchObject({
      kind: "income",
      amount: 3000,
    });
  });
});

describe("parseActionFromLlmResponse", () => {
  it("extracts stxic-action code block and cleans text", () => {
    const raw = `I'll add that to your savings right away!

\`\`\`stxic-action
{
  "kind": "addToSavings",
  "amount": 5000,
  "currency": "PHP"
}
\`\`\``;

    const res = parseActionFromLlmResponse(raw);
    expect(res.cleanText).toBe("I'll add that to your savings right away!");
    expect(res.action).toEqual({
      kind: "addToSavings",
      amount: 5000,
      currency: "PHP",
    });
  });

  it("returns null action when no block is present", () => {
    const res = parseActionFromLlmResponse("Here are your top 3 priorities for today.");
    expect(res.cleanText).toBe("Here are your top 3 priorities for today.");
    expect(res.action).toBeNull();
  });
});

describe("parseAiAction — non-actions", () => {
  it("returns null for plain chat", () => {
    expect(parseAiAction("what's the weather like?", "PHP", NOW)).toBeNull();
    expect(parseAiAction("hello", "PHP", NOW)).toBeNull();
    expect(parseAiAction("", "PHP", NOW)).toBeNull();
  });
});

describe("enrichTaskDescription", () => {
  it("adds a small, useful detail for common task topics", () => {
    expect(enrichTaskDescription("Update UI")).toContain("UI");
    expect(enrichTaskDescription("Fix the crash")).toContain("Reproduce");
    expect(enrichTaskDescription("Study for the exam")).toContain("notes");
  });

  it("falls back to a generic first-step hint", () => {
    expect(enrichTaskDescription("Whatever")).toContain("small steps");
  });
});

describe("describeAction", () => {
  it("summarizes an action for the confirmation bubble", () => {
    const task = parseAiAction("add task: Go to the gym", "PHP", NOW)!;
    expect(describeAction(task)).toContain("Go to the gym");
    const expense = parseAiAction("log expense lunch 250", "PHP", NOW)!;
    expect(describeAction(expense)).toContain("250 PHP");
  });
});
