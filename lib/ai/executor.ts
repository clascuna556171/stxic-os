/**
 * Stxic AI Action Executor — executes structured AI actions against client-side hydrate stores.
 * Handles auto-creation (e.g. General Savings if empty), fuzzy candidate matching,
 * live deep-link URLs, and full Undo/rollback snapshots.
 */

import {
  deleteAccount,
  deleteHabit,
  deleteNote,
  deleteSavingsGoal,
  deleteTask,
  deleteTransaction,
  listAccounts,
  listHabits,
  listNotes,
  listSavingsGoals,
  listTasks,
  saveAccount,
  saveHabit,
  saveNote,
  saveSavingsGoal,
  saveTask,
  saveTransaction,
} from "@/lib/hydrate";
import { currentStreak, dayKey } from "@/lib/habits";
import { resolveSavingsTarget, savingsHint } from "./savings";
import { describeAction, type AiAction } from "./actions";
import type {
  Currency,
  FinanceAccount,
  Habit,
  Note,
  SavingsGoal,
  TaskItem,
  TaskStatus,
  Transaction,
} from "@/types";

export interface ActionCandidate {
  id: string;
  name: string;
  details?: string;
  kind: AiAction["kind"];
}

export interface ActionSnapshot {
  kind: AiAction["kind"];
  id: string;
  wasNewlyCreated?: boolean;
  previousSaved?: number;
  previousBalance?: number;
  previousStatus?: TaskStatus;
  previousStreak?: number;
  previousLog?: Record<string, boolean>;
  goalName?: string;
  taskTitle?: string;
  habitName?: string;
}

export interface ExecutionResult {
  ok: boolean;
  action: AiAction;
  described: string;
  itemId?: string;
  itemTitle?: string;
  itemHref?: string;
  snapshot?: ActionSnapshot;
  candidates?: ActionCandidate[];
  hint?: string;
  error?: string;
}

export async function executeAiAction(
  action: AiAction,
  userText: string = "",
  defaultCurrency: Currency = "PHP",
  now: number = Date.now(),
): Promise<ExecutionResult> {
  try {
    switch (action.kind) {
      case "addToSavings": {
        const goalsRes = await listSavingsGoals();
        const goals = goalsRes.ok ? goalsRes.data : [];
        const resolution = resolveSavingsTarget(action, userText, goals);

        if (resolution.status === "candidates") {
          return {
            ok: false,
            action,
            described: "Multiple savings goals found. Which one would you like to top up?",
            candidates: resolution.goals.map((g) => ({
              id: g.id,
              name: g.name,
              details: `${g.saved}/${g.target} ${g.currency}`,
              kind: "addToSavings",
            })),
            hint: savingsHint(resolution.goals),
          };
        }

        if (resolution.status === "ok") {
          const goal = resolution.goal;
          const previousSaved = goal.saved;
          const newSaved = Math.round((goal.saved + action.amount) * 100) / 100;
          const updated: SavingsGoal = {
            ...goal,
            saved: newSaved,
            updatedAt: now,
          };
          const res = await saveSavingsGoal(updated);
          if (!res.ok) return { ok: false, action, described: "", error: res.error };

          const described = describeAction({ ...action, name: goal.name });
          return {
            ok: true,
            action: { ...action, name: goal.name },
            described,
            itemId: goal.id,
            itemTitle: goal.name,
            itemHref: "/income",
            snapshot: {
              kind: "addToSavings",
              id: goal.id,
              previousSaved,
              goalName: goal.name,
            },
          };
        }

        // status === "none": Auto-create a General Savings goal
        const goalName = resolution.defaultName || action.name || "General Savings";
        const targetAmount = Math.max(action.amount * 2, 10000);
        const newGoal: SavingsGoal = {
          id: crypto.randomUUID(),
          name: goalName,
          target: targetAmount,
          saved: action.amount,
          currency: action.currency,
          createdAt: now,
          updatedAt: now,
        };
        const res = await saveSavingsGoal(newGoal);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };

        const described = describeAction({ ...action, name: goalName });
        return {
          ok: true,
          action: { ...action, name: goalName },
          described: `${described} (Created "${goalName}" goal)`,
          itemId: newGoal.id,
          itemTitle: newGoal.name,
          itemHref: "/income",
          snapshot: {
            kind: "savingsGoal",
            id: newGoal.id,
            wasNewlyCreated: true,
            goalName: newGoal.name,
          },
        };
      }

      case "savingsGoal": {
        const item: SavingsGoal = {
          id: crypto.randomUUID(),
          name: action.name,
          target: action.target,
          saved: action.saved,
          currency: action.currency,
          deadline: action.deadline,
          createdAt: now,
          updatedAt: now,
        };
        const res = await saveSavingsGoal(item);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };
        return {
          ok: true,
          action,
          described: describeAction(action),
          itemId: item.id,
          itemTitle: item.name,
          itemHref: "/income",
          snapshot: { kind: "savingsGoal", id: item.id, wasNewlyCreated: true },
        };
      }

      case "income":
      case "expense": {
        const item: Transaction = {
          id: crypto.randomUUID(),
          type: action.kind,
          label: action.label,
          amount: action.amount,
          currency: action.currency,
          category: action.category,
          date: now,
          createdAt: now,
          updatedAt: now,
        };
        const res = await saveTransaction(item);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };
        return {
          ok: true,
          action,
          described: describeAction(action),
          itemId: item.id,
          itemTitle: item.label,
          itemHref: "/income",
          snapshot: { kind: action.kind, id: item.id, wasNewlyCreated: true },
        };
      }

      case "task": {
        const item: TaskItem = {
          id: crypto.randomUUID(),
          title: action.title,
          description: action.description,
          status: "todo",
          priority: action.priority,
          dueDate: action.dueDate,
          type: action.type ?? "task",
          createdAt: now,
          updatedAt: now,
        };
        const res = await saveTask(item);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };
        return {
          ok: true,
          action,
          described: describeAction(action),
          itemId: item.id,
          itemTitle: item.title,
          itemHref: "/tasks",
          snapshot: { kind: "task", id: item.id, wasNewlyCreated: true },
        };
      }

      case "completeTask": {
        const tasksRes = await listTasks();
        const tasks = tasksRes.ok ? tasksRes.data : [];
        if (tasks.length === 0) {
          return { ok: false, action, described: "", error: "No tasks found in your workspace." };
        }

        let target: TaskItem | undefined;
        if (action.taskId) {
          target = tasks.find((t) => t.id === action.taskId);
        } else {
          const q = action.query.toLowerCase().trim();
          // Look among non-done tasks first
          const openTasks = tasks.filter((t) => t.status !== "done");
          target =
            openTasks.find((t) => t.title.toLowerCase() === q) ??
            openTasks.find((t) => t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase())) ??
            tasks.find((t) => t.title.toLowerCase().includes(q));
        }

        if (!target) {
          const openTasks = tasks.filter((t) => t.status !== "done");
          if (openTasks.length > 0) {
            return {
              ok: false,
              action,
              described: `Couldn't find an open task matching "${action.query}". Did you mean one of these?`,
              candidates: openTasks.slice(0, 4).map((t) => ({
                id: t.id,
                name: t.title,
                details: `${t.priority} · ${t.status}`,
                kind: "completeTask",
              })),
            };
          }
          return { ok: false, action, described: "", error: `Task "${action.query}" not found.` };
        }

        const previousStatus = target.status;
        const updated: TaskItem = { ...target, status: "done", updatedAt: now };
        const res = await saveTask(updated);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };

        return {
          ok: true,
          action: { ...action, query: target.title, taskId: target.id },
          described: `Marked "${target.title}" as completed.`,
          itemId: target.id,
          itemTitle: target.title,
          itemHref: "/tasks",
          snapshot: {
            kind: "completeTask",
            id: target.id,
            previousStatus,
            taskTitle: target.title,
          },
        };
      }

      case "note": {
        const item: Note = {
          id: crypto.randomUUID(),
          title: action.title,
          content: action.content,
          folder: action.folder ?? "",
          tags: action.tags ?? [],
          favorite: false,
          createdAt: now,
          updatedAt: now,
        };
        const res = await saveNote(item);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };
        return {
          ok: true,
          action,
          described: describeAction(action),
          itemId: item.id,
          itemTitle: item.title,
          itemHref: "/notes",
          snapshot: { kind: "note", id: item.id, wasNewlyCreated: true },
        };
      }

      case "account": {
        const item: FinanceAccount = {
          id: crypto.randomUUID(),
          name: action.name,
          kind: action.accountKind,
          currency: action.currency,
          balance: action.balance,
          createdAt: now,
          updatedAt: now,
        };
        const res = await saveAccount(item);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };
        return {
          ok: true,
          action,
          described: describeAction(action),
          itemId: item.id,
          itemTitle: item.name,
          itemHref: "/income",
          snapshot: { kind: "account", id: item.id, wasNewlyCreated: true },
        };
      }

      case "habit": {
        const item: Habit = {
          id: crypto.randomUUID(),
          name: action.name,
          emoji: action.emoji ?? "✨",
          streak: 0,
          log: {},
          createdAt: now,
        };
        const res = await saveHabit(item);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };
        return {
          ok: true,
          action,
          described: describeAction(action),
          itemId: item.id,
          itemTitle: item.name,
          itemHref: "/habits",
          snapshot: { kind: "habit", id: item.id, wasNewlyCreated: true },
        };
      }

      case "checkHabit": {
        const habitsRes = await listHabits();
        const habits = habitsRes.ok ? habitsRes.data : [];
        if (habits.length === 0) {
          return { ok: false, action, described: "", error: "No habits found. Create one first!" };
        }

        let target: Habit | undefined;
        if (action.habitId) {
          target = habits.find((h) => h.id === action.habitId);
        } else {
          const q = action.query.toLowerCase().trim();
          target =
            habits.find((h) => h.name.toLowerCase() === q) ??
            habits.find((h) => h.name.toLowerCase().includes(q) || q.includes(h.name.toLowerCase()));
        }

        if (!target) {
          return {
            ok: false,
            action,
            described: `Which habit would you like to check in?`,
            candidates: habits.map((h) => ({
              id: h.id,
              name: `${h.emoji ? h.emoji + " " : ""}${h.name}`,
              details: `${h.streak}-day streak`,
              kind: "checkHabit",
            })),
          };
        }

        const dateKey = dayKey(now);
        const previousStreak = target.streak;
        const previousLog = { ...target.log };
        const newLog = { ...target.log, [dateKey]: true };
        const updated: Habit = {
          ...target,
          log: newLog,
          streak: currentStreak(newLog, now),
        };
        const res = await saveHabit(updated);
        if (!res.ok) return { ok: false, action, described: "", error: res.error };

        return {
          ok: true,
          action: { ...action, query: target.name, habitId: target.id },
          described: `Checked in ${target.emoji ? target.emoji + " " : ""}${target.name} (${updated.streak}-day streak)!`,
          itemId: target.id,
          itemTitle: target.name,
          itemHref: "/habits",
          snapshot: {
            kind: "checkHabit",
            id: target.id,
            previousStreak,
            previousLog,
            habitName: target.name,
          },
        };
      }
    }
  } catch (error) {
    return { ok: false, action, described: "", error: (error as Error).message };
  }
}

/** Undo an executed action, cleanly restoring previous state or removing new items. */
export async function undoAiAction(
  snapshot: ActionSnapshot,
): Promise<{ ok: boolean; message: string; error?: string }> {
  try {
    if (snapshot.wasNewlyCreated) {
      let res: { ok: boolean; error?: string } = { ok: true };
      switch (snapshot.kind) {
        case "task":
          res = await deleteTask(snapshot.id);
          break;
        case "note":
          res = await deleteNote(snapshot.id);
          break;
        case "income":
        case "expense":
          res = await deleteTransaction(snapshot.id);
          break;
        case "savingsGoal":
          res = await deleteSavingsGoal(snapshot.id);
          break;
        case "account":
          res = await deleteAccount(snapshot.id);
          break;
        case "habit":
          res = await deleteHabit(snapshot.id);
          break;
      }
      if (!res.ok) return { ok: false, message: "", error: res.error };
      return { ok: true, message: "Created item removed." };
    }

    if (snapshot.kind === "addToSavings" && snapshot.previousSaved != null) {
      const goalsRes = await listSavingsGoals();
      const goal = goalsRes.ok ? goalsRes.data.find((g) => g.id === snapshot.id) : null;
      if (!goal) return { ok: false, message: "", error: "Goal no longer exists." };
      const res = await saveSavingsGoal({
        ...goal,
        saved: snapshot.previousSaved,
        updatedAt: Date.now(),
      });
      if (!res.ok) return { ok: false, message: "", error: res.error };
      return {
        ok: true,
        message: `${goal.name} restored to ${goal.currency} ${snapshot.previousSaved}.`,
      };
    }

    if (snapshot.kind === "completeTask" && snapshot.previousStatus) {
      const tasksRes = await listTasks();
      const task = tasksRes.ok ? tasksRes.data.find((t) => t.id === snapshot.id) : null;
      if (!task) return { ok: false, message: "", error: "Task no longer exists." };
      const res = await saveTask({
        ...task,
        status: snapshot.previousStatus,
        updatedAt: Date.now(),
      });
      if (!res.ok) return { ok: false, message: "", error: res.error };
      return { ok: true, message: `Task restored to "${snapshot.previousStatus}".` };
    }

    if (snapshot.kind === "checkHabit" && snapshot.previousLog) {
      const habitsRes = await listHabits();
      const habit = habitsRes.ok ? habitsRes.data.find((h) => h.id === snapshot.id) : null;
      if (!habit) return { ok: false, message: "", error: "Habit no longer exists." };
      const res = await saveHabit({
        ...habit,
        log: snapshot.previousLog,
        streak: snapshot.previousStreak ?? 0,
      });
      if (!res.ok) return { ok: false, message: "", error: res.error };
      return { ok: true, message: `Habit check-in undone.` };
    }

    return { ok: false, message: "", error: "Unknown undo target." };
  } catch (error) {
    return { ok: false, message: "", error: (error as Error).message };
  }
}
