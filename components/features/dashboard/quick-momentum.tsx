"use client";

import { CheckCircle2, CircleDollarSign, Repeat, Timer } from "lucide-react";

interface QuickMomentumProps {
  tasksCount?: number;
  habitsCount?: number;
  focusMinutes?: number;
  transactionsCount?: number;
}

export function QuickMomentum({
  tasksCount = 0,
  habitsCount = 0,
  focusMinutes = 0,
  transactionsCount = 0,
}: QuickMomentumProps) {
  const chips = [
    { label: "Active Tasks", count: tasksCount.toString(), icon: CheckCircle2 },
    { label: "Habits Tracked", count: habitsCount.toString(), icon: Repeat },
    { label: "Focus Recorded", count: `${Math.round(focusMinutes)}m`, icon: Timer },
    { label: "Ledger Entries", count: transactionsCount.toString(), icon: CircleDollarSign },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
      {/* Left 4 Chips Grid */}
      <div className="lg:col-span-7 grid grid-cols-2 gap-3">
        {chips.map((chip, idx) => (
          <div
            key={idx}
            className="border-border/80 bg-surface/80 hover:bg-surface-2/60 flex items-center justify-between rounded-xl border px-4 py-3 shadow-2xs transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <chip.icon className="text-muted size-4 shrink-0" />
              <span className="text-muted truncate text-xs font-medium">{chip.label}</span>
            </div>
            <span className="text-foreground font-semibold text-sm ml-2">{chip.count}</span>
          </div>
        ))}
      </div>

      {/* Right "Weekly Momentum" Wave Card */}
      <div className="lg:col-span-5 border-border/80 bg-surface/90 flex flex-col justify-between rounded-xl border p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-foreground text-xs font-semibold">Execution Momentum</span>
          <span className="bg-accent/15 text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full border border-accent/20">
            {tasksCount > 0 || focusMinutes > 0 ? "On Track" : "Ready"}
          </span>
        </div>

        {/* Glowing Wave SVG */}
        <div className="h-14 w-full relative flex items-end">
          <svg
            viewBox="0 0 300 80"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="neonWaveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 65 Q 40 75 70 50 T 140 45 T 210 20 T 300 35 L 300 80 L 0 80 Z"
              fill="url(#neonWaveGrad)"
            />
            <path
              d="M 0 65 Q 40 75 70 50 T 140 45 T 210 20 T 300 35"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
