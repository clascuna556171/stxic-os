import { describe, expect, it } from "vitest";
import { describeAction, enrichTaskDescription, parseAiAction } from "@/lib/ai/actions";

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
