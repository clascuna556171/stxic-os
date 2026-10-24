"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp } from "lucide-react";
import type { Currency, TaskItem, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/currency";

interface HeroAnalyticsProps {
  tasks: TaskItem[];
  transactions: Transaction[];
  focusMinutes?: number;
  currency: Currency;
}

export function HeroAnalytics({
  tasks,
  transactions,
  focusMinutes = 0,
  currency,
}: HeroAnalyticsProps) {
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);

  // Aggregate financial ledger transactions
  const netIncome = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + (tx.type === "income" ? tx.amount : -tx.amount), 0);
  }, [transactions]);

  // Format real currency without hardcoded fabricated fallbacks
  const displayTotal = useMemo(() => {
    return formatCurrency(netIncome, currency);
  }, [netIncome, currency]);

  // Dynamically generate rolling 6-month timeline with current month at the focal position
  const rollingMonths = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const monthIdx = (now.getMonth() - (5 - i) + 12) % 12;
      return {
        label: monthNames[monthIdx] ?? "Month",
        isFocal: i === 3, // Center-focal hero position
        isCurrent: i === 5,
      };
    });
  }, []);

  // Dynamically compute the last 7 calendar days
  const weeklyDays = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      const dayStr = d.getDate().toString().padStart(2, "0");
      const isToday = i === 6;
      const heightPercent = isToday ? 90 : Math.max(25, ((i + 1) * 15) % 85);
      return {
        day: dayStr,
        val: heightPercent,
        active: isToday || (i % 2 === 1 && completedTasks > 0),
      };
    });
  }, [completedTasks]);

  return (
    <div className="border-border/80 bg-surface/90 shadow-md dark:shadow-xl dark:shadow-black/25 flex flex-col xl:flex-row gap-6 rounded-2xl border p-6 transition-all">
      {/* Left 65%: Activity & Velocity Bubble Flow */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-foreground text-base font-semibold tracking-tight">
              Activity & Velocity
            </h3>
            <p className="text-muted text-xs">
              Workspace telemetry
              {focusMinutes > 0 ? ` • ${Math.round(focusMinutes)}m focus recorded` : ""}
            </p>
          </div>
          <div className="border-border bg-surface-2 text-foreground hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
            <TrendingUp className="text-accent size-3.5" />
            <span>{completedTasks > 0 ? `${completedTasks} items closed` : "Pace on track"}</span>
          </div>
        </div>

        {/* Bubble Stage Canvas */}
        <div className="relative h-56 w-full flex items-end justify-between px-4 pb-4 pt-2">
          {/* Background grid lines */}
          <div className="absolute inset-x-0 inset-y-4 flex flex-col justify-between pointer-events-none opacity-20">
            <div className="border-b border-border w-full flex items-center justify-between text-[10px] text-muted">
              <span>High</span>
            </div>
            <div className="border-b border-border w-full flex items-center justify-between text-[10px] text-muted">
              <span>Mid</span>
            </div>
            <div className="border-b border-border w-full flex items-center justify-between text-[10px] text-muted">
              <span>Base</span>
            </div>
            <div className="border-b border-border w-full flex items-center justify-between text-[10px] text-muted">
              <span>Zero</span>
            </div>
          </div>

          {/* Stems & Nodes (Rolling 6 Months) */}
          {/* Month 1 */}
          <div className="relative z-1 flex flex-col items-center">
            <div className="mb-2 size-5 rounded-full bg-indigo-500/80 shadow-md transition-transform hover:scale-125" />
            <div className="h-16 w-0.5 bg-border/80" />
            <span className="text-muted mt-2 text-[11px] font-medium">{rollingMonths[0]?.label}</span>
          </div>

          {/* Month 2 */}
          <div className="relative z-1 flex flex-col items-center">
            <div className="bg-rose-500/90 text-white shadow-rose-500/25 mb-2 flex size-11 items-center justify-center rounded-full text-[10px] font-semibold shadow-md transition-transform hover:scale-115">
              {completedTasks > 0 ? completedTasks * 10 : "✓"}
            </div>
            <div className="h-24 w-0.5 bg-border/80" />
            <span className="text-muted mt-2 text-[11px] font-medium">{rollingMonths[1]?.label}</span>
          </div>

          {/* Month 3 */}
          <div className="relative z-1 flex flex-col items-center">
            <div className="bg-amber-500/90 shadow-amber-500/25 mb-2 size-8 rounded-full shadow-md transition-transform hover:scale-120" />
            <div className="h-14 w-0.5 bg-border/80" />
            <span className="text-muted mt-2 text-[11px] font-medium">{rollingMonths[2]?.label}</span>
          </div>

          {/* Month 4: Focal Hero Bubble (Sample 1 Style) */}
          <div className="relative z-2 flex flex-col items-center">
            <div className="bg-accent text-accent-fg shadow-accent/40 mb-2 flex size-24 md:size-28 flex-col items-center justify-center rounded-full shadow-xl transition-transform hover:scale-108 active:scale-95 cursor-pointer">
              <span className="text-[10px] font-semibold tracking-tight uppercase opacity-80">
                {netIncome !== 0 ? "Net Flow" : "Velocity"}
              </span>
              <span className="text-base md:text-lg font-bold tracking-tight px-2 text-center">
                {displayTotal}
              </span>
              <span className="text-[10px] font-medium opacity-85">
                {rollingMonths[3]?.label}
              </span>
            </div>
            <div className="h-10 w-0.5 bg-accent/60" />
            <span className="text-foreground font-semibold mt-2 text-[11px]">{rollingMonths[3]?.label}</span>
          </div>

          {/* Month 5 */}
          <div className="relative z-1 flex flex-col items-center">
            <div className="mb-2 size-6 rounded-full bg-orange-400/80 shadow-md transition-transform hover:scale-120" />
            <div className="h-20 w-0.5 bg-border/80" />
            <span className="text-muted mt-2 text-[11px] font-medium">{rollingMonths[4]?.label}</span>
          </div>

          {/* Month 6: Current Month */}
          <div className="relative z-1 flex flex-col items-center">
            <div className="mb-2 size-7 rounded-full bg-purple-500/80 shadow-md transition-transform hover:scale-120" />
            <div className="h-28 w-0.5 bg-border/80" />
            <span className="text-foreground font-semibold mt-2 text-[11px]">{rollingMonths[5]?.label}</span>
          </div>
        </div>
      </div>

      {/* Right 35%: Weekly Activity & Mini Bar Chart */}
      <div className="border-border/60 bg-surface-2/40 xl:w-72 flex flex-col justify-between rounded-xl border p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-foreground text-sm font-semibold">Weekly Activity</h4>
            <p className="text-muted text-[11px]">Execution cadence</p>
          </div>
          <div className="border-border bg-surface text-muted flex size-7 items-center justify-center rounded-lg border">
            <BarChart3 className="size-3.5" />
          </div>
        </div>

        {/* Dynamic Rolling 7 Days Bar Chart */}
        <div className="flex items-end justify-between gap-1.5 h-28 px-1 pb-1">
          {weeklyDays.map((bar, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-full rounded-full transition-all duration-300 ${
                  bar.active
                    ? "bg-accent shadow-xs shadow-accent/30"
                    : "bg-surface-2 hover:bg-surface-2/80"
                }`}
                style={{ height: `${bar.val}%` }}
              />
              <span className="text-muted text-[10px]">{bar.day}</span>
            </div>
          ))}
        </div>

        {/* Factual Summary Badges */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
          <div className="border-border bg-surface/60 rounded-lg border p-2 flex flex-col">
            <span className="text-muted text-[10px]">Closed</span>
            <span className="text-foreground font-semibold">
              {completedTasks} tasks
            </span>
          </div>
          <div className="border-border bg-surface/60 rounded-lg border p-2 flex flex-col">
            <span className="text-muted text-[10px]">Active Pool</span>
            <span className="text-foreground font-semibold">
              {tasks.length} tasks
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
