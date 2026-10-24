"use client";

import { CheckCircle2, Shield, Target, Timer } from "lucide-react";
import type { Habit, TaskItem } from "@/types";

interface CapsuleMetricsProps {
  tasks: TaskItem[];
  habits: Habit[];
  focusMin: number;
}

export function CapsuleMetrics({ tasks, habits, focusMin }: CapsuleMetricsProps) {
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const focusHours = (focusMin / 60).toFixed(1);
  const totalHabits = habits.length;
  const habitsStreaking = habits.filter((h) => h.streak > 0).length;

  const totalItems = tasks.length + habits.length;
  const completedItems = completedTasks + habitsStreaking;
  const healthPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;

  const metrics = [
    {
      id: "tasks-completed",
      label: "TASKS COMPLETED",
      value: completedTasks.toString(),
      delta: `${completedTasks} of ${tasks.length}`,
      deltaPositive: completedTasks > 0,
      icon: CheckCircle2,
      gradient: "from-blue-500 to-indigo-600",
      lightBg: "bg-sky-50/80 dark:bg-surface border-sky-200/70 dark:border-border/80",
    },
    {
      id: "focus-time",
      label: "FOCUS HOURS",
      value: `${focusHours}h`,
      delta: focusMin > 0 ? `${focusMin}m total` : "0m recorded",
      deltaPositive: focusMin > 0,
      icon: Timer,
      gradient: "from-emerald-400 to-teal-500",
      lightBg: "bg-emerald-50/80 dark:bg-surface border-emerald-200/70 dark:border-border/80",
    },
    {
      id: "habits-active",
      label: "ACTIVE OBJECTIVES",
      value: totalHabits > 0 ? `${habitsStreaking}/${totalHabits}` : "0",
      delta: habitsStreaking > 0 ? `${habitsStreaking} on streak` : "No streak",
      deltaPositive: habitsStreaking > 0,
      icon: Target,
      gradient: "from-cyan-400 to-blue-500",
      lightBg: "bg-amber-50/80 dark:bg-surface border-amber-200/70 dark:border-border/80",
    },
    {
      id: "system-health",
      label: "PROJECT HEALTH",
      value: `${healthPct}%`,
      delta: healthPct >= 80 ? "Optimal" : healthPct >= 50 ? "In Progress" : "Attention",
      deltaPositive: healthPct >= 50,
      icon: Shield,
      gradient: "from-lime-400 to-emerald-600",
      lightBg: "bg-violet-50/80 dark:bg-surface border-violet-200/70 dark:border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 pb-3">
      {metrics.map((m) => (
        <div key={m.id} className="card-stacked">
          <div
            className={`border rounded-2xl p-4 md:p-5 flex flex-col justify-between shadow-xs dark:shadow-md transition-all hover:-translate-y-0.5 ${m.lightBg}`}
          >
            {/* Header: Icon Squircle + Delta Badge */}
            <div className="flex items-center justify-between mb-4">
              <div
                className={`size-10 rounded-xl bg-gradient-to-br ${m.gradient} text-white flex items-center justify-center shadow-sm`}
              >
                <m.icon className="size-5" />
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  m.deltaPositive
                    ? "text-emerald-700 bg-emerald-100/90 dark:text-emerald-400 dark:bg-emerald-500/10"
                    : "text-rose-700 bg-rose-100/90 dark:text-rose-400 dark:bg-rose-500/10"
                }`}
              >
                {m.delta}
              </span>
            </div>

            {/* Metric Body */}
            <div>
              <p className="text-muted text-[11px] font-medium tracking-wider uppercase mb-1">
                {m.label}
              </p>
              <h4 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight">
                {m.value}
              </h4>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
