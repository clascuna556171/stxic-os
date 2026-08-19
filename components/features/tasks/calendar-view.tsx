"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskItem } from "@/types";
import { isOverdue, monthGrid, tasksOnDate } from "@/lib/tasks";
import { formatDate, toISODate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { PriorityBadge } from "@/components/features/tasks/priority-badge";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DOT: Record<string, string> = {
  P0: "bg-danger",
  P1: "bg-warning",
  P2: "bg-muted",
};

interface CalendarViewProps {
  tasks: TaskItem[];
  onEdit: (t: TaskItem) => void;
  onAdd: (date: Date) => void;
}

export function CalendarView({ tasks, onEdit, onAdd }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);

  const weeks = monthGrid(year, month);
  const selectedTasks = tasksOnDate(tasks, selected);
  const todayKey = toISODate(today);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="border-border bg-surface rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-foreground text-sm font-semibold">
            {new Date(year, month, 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => shift(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-muted px-1 pb-1 text-center text-[11px] font-medium uppercase"
            >
              {d}
            </div>
          ))}
          {weeks.flat().map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-14 rounded-md" />;
            const key = toISODate(date);
            const dayTasks = tasksOnDate(tasks, date);
            const isSelected = toISODate(selected) === key;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(date)}
                className={cn(
                  "hover:bg-surface-2/60 flex min-h-14 flex-col gap-1 rounded-md p-1 text-left transition-colors",
                  isSelected && "bg-surface-2",
                  !isSelected && isToday && "bg-surface-2/40",
                )}
              >
                <span
                  className={cn(
                    "text-muted text-xs",
                    isToday && "text-accent font-semibold",
                    date.getMonth() !== month && "opacity-40",
                  )}
                >
                  {date.getDate()}
                </span>
                {dayTasks.slice(0, 3).map((t) => (
                  <span key={t.id} className="flex items-center gap-1 truncate text-[10px]">
                    <span className={cn("size-1.5 shrink-0 rounded-full", DOT[t.priority])} />
                    <span
                      className={cn("truncate", t.status === "done" && "line-through opacity-50")}
                    >
                      {t.title}
                    </span>
                  </span>
                ))}
                {dayTasks.length > 3 ? (
                  <span className="text-muted text-[10px]">+{dayTasks.length - 3} more</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="border-border bg-surface rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-foreground text-sm font-semibold">{formatDate(selected)}</h3>
          <Button variant="secondary" size="sm" onClick={() => onAdd(selected)}>
            <Plus />
            Add
          </Button>
        </div>
        {selectedTasks.length === 0 ? (
          <p className="text-muted text-sm">No tasks due this day.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onEdit(t)}
                className="border-border bg-surface hover:bg-surface-2 flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors"
              >
                <span
                  className={cn(
                    "text-foreground break-words text-sm font-medium",
                    t.status === "done" && "text-muted line-through",
                  )}
                >
                  {t.title || "Untitled task"}
                </span>
                {t.description ? (
                  <span className="text-muted break-words whitespace-pre-wrap text-xs">
                    {t.description}
                  </span>
                ) : null}
                <span className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  {isOverdue(t) ? <span className="text-danger text-xs">Overdue</span> : null}
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
