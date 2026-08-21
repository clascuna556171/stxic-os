/**
 * Resolve which savings goal a natural-language top-up ("add 5k at the
 * savings", "add 1k to my emergency fund") refers to. Pure + unit-tested;
 * used by both AI chat surfaces.
 */

import type { SavingsGoal } from "@/types";
import type { AiAction } from "./actions";

type TopUp = Extract<AiAction, { kind: "addToSavings" }>;

export type SavingsResolution =
  | { status: "ok"; goal: SavingsGoal }
  | { status: "none" }
  | { status: "candidates"; goals: SavingsGoal[] };

export function resolveSavingsTarget(
  topUp: TopUp,
  text: string,
  goals: SavingsGoal[],
): SavingsResolution {
  if (goals.length === 0) return { status: "none" };

  // 1) Explicit name captured by the parser (exact, then partial).
  if (topUp.name) {
    const q = topUp.name.toLowerCase();
    const exact = goals.find((g) => g.name.toLowerCase() === q);
    if (exact) return { status: "ok", goal: exact };
    const partial = goals.find((g) => {
      const n = g.name.toLowerCase();
      return n.includes(q) || q.includes(n);
    });
    if (partial) return { status: "ok", goal: partial };
  }

  // 2) Fuzzy: any goal name mentioned anywhere in the message.
  const lower = text.toLowerCase();
  const fuzzy = goals.find(
    (g) => g.name.trim().length >= 3 && lower.includes(g.name.toLowerCase()),
  );
  if (fuzzy) return { status: "ok", goal: fuzzy };

  // 3) Unambiguous when there's only one goal.
  if (goals.length === 1) return { status: "ok", goal: goals[0]! };

  // 4) Several goals and no hint — ask which one.
  return { status: "candidates", goals };
}

/** Helpful reply for unresolved top-ups (ask-first, never auto-create). */
export function savingsHint(goals: SavingsGoal[]): string {
  if (goals.length === 0) {
    return 'You don\u2019t have a savings goal yet. Create one first \u2014 say "add savings goal: Emergency fund target 20000" \u2014 then I can add to it.';
  }
  const list = goals.map((g) => `\u2022 ${g.name} (${g.saved}/${g.target} ${g.currency})`).join("\n");
  return `Which goal should I add to?\n${list}\nFor example: "add 5k to ${goals[0]!.name}".`;
}
