"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Flame,
  ListTodo,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Undo2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { undoAiAction, type ActionCandidate, type ActionSnapshot } from "@/lib/ai/executor";
import type { AiAction } from "@/lib/ai/actions";

export interface ActionCardProps {
  action: AiAction;
  described: string;
  itemId?: string;
  itemTitle?: string;
  itemHref?: string;
  snapshot?: ActionSnapshot;
  candidates?: ActionCandidate[];
  onSelectCandidate?: (candidate: ActionCandidate) => void;
  onUndone?: () => void;
}

function getActionMeta(kind: AiAction["kind"]) {
  switch (kind) {
    case "addToSavings":
      return {
        label: "Savings Top-Up",
        icon: PiggyBank,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        badgeVariant: "success" as const,
        navLabel: "View in Savings",
        defaultHref: "/income",
      };
    case "savingsGoal":
      return {
        label: "Savings Goal",
        icon: PiggyBank,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        badgeVariant: "success" as const,
        navLabel: "View Goal",
        defaultHref: "/income",
      };
    case "income":
      return {
        label: "Income Logged",
        icon: TrendingUp,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        badgeVariant: "success" as const,
        navLabel: "View in Income",
        defaultHref: "/income",
      };
    case "expense":
      return {
        label: "Expense Logged",
        icon: TrendingDown,
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        badgeVariant: "danger" as const,
        navLabel: "View in Expenses",
        defaultHref: "/income",
      };
    case "account":
      return {
        label: "Account Added",
        icon: Wallet,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        badgeVariant: "info" as const,
        navLabel: "View Accounts",
        defaultHref: "/income",
      };
    case "task":
      return {
        label: "Task Created",
        icon: ListTodo,
        color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
        badgeVariant: "info" as const,
        navLabel: "View in Tasks",
        defaultHref: "/tasks",
      };
    case "completeTask":
      return {
        label: "Task Completed",
        icon: CheckCircle2,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        badgeVariant: "success" as const,
        navLabel: "Open Tasks",
        defaultHref: "/tasks",
      };
    case "note":
      return {
        label: "Note Saved",
        icon: FileText,
        color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
        badgeVariant: "neutral" as const,
        navLabel: "Open Notes",
        defaultHref: "/notes",
      };
    case "habit":
      return {
        label: "Habit Created",
        icon: Flame,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        badgeVariant: "warning" as const,
        navLabel: "View Habits",
        defaultHref: "/habits",
      };
    case "checkHabit":
      return {
        label: "Habit Checked In",
        icon: Flame,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        badgeVariant: "warning" as const,
        navLabel: "View Habits",
        defaultHref: "/habits",
      };
  }
}

export function ActionCard({
  action,
  described,
  itemHref,
  snapshot,
  candidates,
  onSelectCandidate,
  onUndone,
}: ActionCardProps) {
  const [undone, setUndone] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const meta = getActionMeta(action.kind);
  const Icon = meta.icon;
  const href = itemHref || meta.defaultHref;

  async function handleUndo() {
    if (!snapshot || undoing || undone) return;
    setUndoing(true);
    try {
      const res = await undoAiAction(snapshot);
      if (res.ok) {
        setUndone(true);
        toast({ title: "Undone", description: res.message });
        onUndone?.();
      } else {
        toast({ title: "Couldn't undo", description: res.error, variant: "danger" });
      }
    } finally {
      setUndoing(false);
    }
  }

  // Candidate selection mode (ambiguity)
  if (candidates && candidates.length > 0) {
    return (
      <div className="mt-2 rounded-xl border border-border/70 bg-card/90 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold text-foreground">Select an option:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {candidates.map((cand) => (
            <button
              key={cand.id}
              onClick={() => onSelectCandidate?.(cand)}
              className="group flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"
            >
              <span>{cand.name}</span>
              {cand.details && (
                <span className="text-[10px] text-muted-foreground group-hover:text-primary/70">
                  ({cand.details})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mt-2.5 flex flex-col gap-2 rounded-xl border p-3 shadow-sm transition-all duration-200 ${
        undone
          ? "border-dashed border-border/60 bg-muted/40 opacity-75"
          : "border-border/80 bg-card/95 backdrop-blur-md hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${meta.color}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                {undone ? `(Undone) ${meta.label}` : meta.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!undone && href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <span>{meta.navLabel}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}

          {snapshot && !undone && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoing}
              className="h-6 gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-3 w-3" />
              <span>{undoing ? "Undoing..." : "Undo"}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="pl-9 pr-1">
        <p className={`text-xs ${undone ? "line-through text-muted-foreground" : "text-foreground/90 font-medium"}`}>
          {described}
        </p>
      </div>
    </div>
  );
}
