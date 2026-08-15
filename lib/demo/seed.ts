/**
 * Demo / guest mode seeding. Pure sample-data builders + hydrate-backed
 * seed/reset. Demo data is non-sensitive and lives in an anonymous user's own
 * (sandboxed) collections, encrypted with a random demo DEK.
 */

import {
  deleteFocusSession,
  deleteHabit,
  deleteIncomeEntry,
  deleteNote,
  deleteTask,
  deleteVaultItem,
  listFocusSessions,
  listHabits,
  listIncome,
  listNotes,
  listTasks,
  listVault,
  saveFocusSession,
  saveHabit,
  saveIncomeEntry,
  saveNote,
  saveTask,
  saveVaultItem,
} from "@/lib/hydrate";
import { toISODate } from "@/lib/utils/dates";
import type { FocusSession, Habit, IncomeEntry, Note, TaskItem, VaultItem } from "@/types";

export interface DemoSeed {
  vault: VaultItem[];
  notes: Note[];
  tasks: TaskItem[];
  income: IncomeEntry[];
  habits: Habit[];
  focusSessions: FocusSession[];
}

function daysAgo(days: number, hour = 9): number {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

/** Fill `log` with `streak` consecutive completed days ending at `now`. */
function habitLog(streak: number, now: number): Record<string, boolean> {
  const log: Record<string, boolean> = {};
  for (let i = 0; i < streak; i++) {
    log[toISODate(now - i * 86_400_000)] = true;
  }
  return log;
}

/** Build the sample data set (pure — no Firestore, unit-tested). */
export function buildDemoSeed(now = Date.now()): DemoSeed {
  const vault: VaultItem[] = [
    {
      id: crypto.randomUUID(),
      folder: "Work",
      name: "GitHub",
      username: "you@example.com",
      password: "correct-horse-battery",
      url: "https://github.com",
      tags: ["dev", "work"],
      favorite: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      folder: "School",
      name: "University portal",
      username: "student@um.edu.ph",
      password: "portal-pass-2026",
      url: "https://portal.um.edu.ph",
      tags: ["school"],
      favorite: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      folder: "Personal",
      name: "Neighborhood Wi-Fi",
      username: "admin",
      password: "router-password",
      notes: "SSID: HomeBase-5G",
      tags: ["home"],
      favorite: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const notes: Note[] = [
    {
      id: crypto.randomUUID(),
      title: "Welcome to Stxic",
      content:
        "# Welcome 👋\n\nThis is your **demo workspace** — sample data, not real.\n\nTry the sidebar pages:\n- **Vault** — logins with a strength meter\n- **Notes** — this markdown editor\n- **Tasks** — drag between board columns\n- **Income** — monthly chart + FX\n- **Focus** — Pomodoro timer\n",
      folder: "",
      tags: ["demo"],
      favorite: true,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: crypto.randomUUID(),
      title: "Lecture — Data Structures",
      content:
        "# Data Structures\n\n## Key points\n- Linked lists vs arrays\n- Hash tables: O(1) average lookup\n\n## Homework\n- [ ] Implement a stack\n- [ ] Complexity worksheet\n\n```ts\nclass Stack<T> {\n  push(x: T) {}\n  pop(): T | undefined {}\n}\n```\n",
      folder: "School",
      tags: ["school", "study"],
      favorite: false,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
    },
    {
      id: crypto.randomUUID(),
      title: "Project ideas",
      content:
        "# Ideas\n\n- Personal finance tracker\n- Study planner with Pomodoro\n- RSS reader for AI news\n",
      folder: "Projects",
      tags: ["ideas"],
      favorite: false,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(6),
    },
  ];

  const tasks: TaskItem[] = [
    {
      id: crypto.randomUUID(),
      title: "Submit lab report",
      description: "Physics lab — measurement uncertainty.",
      status: "todo",
      priority: "P0",
      dueDate: daysAgo(0, 17),
      type: "task",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: crypto.randomUUID(),
      title: "Review data structures notes",
      status: "todo",
      priority: "P1",
      dueDate: daysAgo(1, 20),
      type: "task",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: crypto.randomUUID(),
      title: "Draft project proposal",
      description: "One page outline for the capstone.",
      status: "in_progress",
      priority: "P1",
      dueDate: daysAgo(-2, 12),
      type: "task",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      id: crypto.randomUUID(),
      title: "Pay internet bill",
      status: "done",
      priority: "P2",
      dueDate: daysAgo(1, 9),
      type: "task",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(1),
    },
    {
      id: crypto.randomUUID(),
      title: "Read chapter 5",
      status: "todo",
      priority: "P2",
      dueDate: daysAgo(-5, 18),
      type: "task",
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const income: IncomeEntry[] = [
    {
      id: crypto.randomUUID(),
      label: "Freelance project",
      amount: 4500,
      currency: "PHP",
      category: "Freelance",
      date: daysAgo(40),
      createdAt: daysAgo(40),
      updatedAt: daysAgo(40),
    },
    {
      id: crypto.randomUUID(),
      label: "Monthly allowance",
      amount: 3000,
      currency: "PHP",
      category: "Allowance",
      date: daysAgo(32),
      createdAt: daysAgo(32),
      updatedAt: daysAgo(32),
    },
    {
      id: crypto.randomUUID(),
      label: "Tutoring",
      amount: 1200,
      currency: "PHP",
      category: "Freelance",
      date: daysAgo(12),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      id: crypto.randomUUID(),
      label: "Monthly allowance",
      amount: 3000,
      currency: "PHP",
      category: "Allowance",
      date: daysAgo(2),
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: crypto.randomUUID(),
      label: "Birthday gift",
      amount: 500,
      currency: "PHP",
      category: "Gift",
      date: daysAgo(6),
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
  ];

  const habits: Habit[] = [
    {
      id: crypto.randomUUID(),
      name: "Morning run",
      emoji: "🏃",
      streak: 4,
      log: habitLog(4, now),
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: "Read 20 pages",
      emoji: "📖",
      streak: 2,
      log: habitLog(2, now),
      createdAt: now,
    },
  ];

  const focusSessions: FocusSession[] = [];
  for (let i = 0; i < 14; i++) {
    if (i % 3 === 2) continue; // skip a few days for a realistic pattern
    focusSessions.push({
      id: crypto.randomUUID(),
      start: daysAgo(i, 15),
      duration: 25 * 60,
      createdAt: daysAgo(i, 15),
    });
  }

  return { vault, notes, tasks, income, habits, focusSessions };
}

/** True when the demo account has no seeded data yet. */
async function isEmpty(): Promise<boolean> {
  const [vault, notes, tasks, income] = await Promise.all([
    listVault(),
    listNotes(),
    listTasks(),
    listIncome(),
  ]);
  return (
    (!vault.ok || vault.data.length === 0) &&
    (!notes.ok || notes.data.length === 0) &&
    (!tasks.ok || tasks.data.length === 0) &&
    (!income.ok || income.data.length === 0)
  );
}

/** Seed the demo account with sample data (idempotent). */
export async function seedDemoData(): Promise<void> {
  if (!(await isEmpty())) return;
  const seed = buildDemoSeed();
  for (const item of seed.vault) await saveVaultItem(item);
  for (const item of seed.notes) await saveNote(item);
  for (const item of seed.tasks) await saveTask(item);
  for (const item of seed.income) await saveIncomeEntry(item);
  for (const item of seed.habits) await saveHabit(item);
  for (const item of seed.focusSessions) await saveFocusSession(item);
}

/** Wipe and re-seed the demo account ("Start fresh"). */
export async function resetDemo(): Promise<void> {
  const [vault, notes, tasks, income, habits, focus] = await Promise.all([
    listVault(),
    listNotes(),
    listTasks(),
    listIncome(),
    listHabits(),
    listFocusSessions(),
  ]);
  if (vault.ok) for (const item of vault.data) await deleteVaultItem(item.id);
  if (notes.ok) for (const item of notes.data) await deleteNote(item.id);
  if (tasks.ok) for (const item of tasks.data) await deleteTask(item.id);
  if (income.ok) for (const item of income.data) await deleteIncomeEntry(item.id);
  if (habits.ok) for (const item of habits.data) await deleteHabit(item.id);
  if (focus.ok) for (const item of focus.data) await deleteFocusSession(item.id);
  await seedDemoData();
}
