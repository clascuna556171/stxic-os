"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { aiChatOnce } from "@/lib/ai/client";
import { plannerMessages } from "@/lib/ai/planner";
import { buildTermGrid, termItemsForWeek, type TermItem } from "@/lib/semester";
import { getBlackboard, listTasks } from "@/lib/hydrate";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { BlackboardEvent, TaskItem } from "@/types";

const MarkdownPreview = dynamic(
  () => import("@/components/features/notes/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

const DAY_MS = 24 * 60 * 60 * 1000;

function toTask(item: TermItem): TaskItem {
  return {
    id: item.id,
    title: item.title,
    status: "todo",
    priority: item.source === "task" ? (item.priority ?? "P1") : "P1",
    dueDate: item.due,
    type: item.source === "blackboard" ? "assignment" : "task",
    createdAt: 0,
    updatedAt: 0,
  };
}

export default function SemesterPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [events, setEvents] = useState<BlackboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [planFor, setPlanFor] = useState<{ label: string; items: TermItem[] } | null>(null);
  const [plan, setPlan] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [t, b] = await Promise.all([listTasks(), getBlackboard()]);
      if (cancelled) return;
      if (t.ok) setTasks(t.data);
      if (b.ok) setEvents(b.data.events);
      setNow(Date.now());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weeks = useMemo(() => (now ? buildTermGrid(now) : []), [now]);

  const hasData = tasks.some((t) => t.status !== "done" && t.dueDate != null) || events.length > 0;

  async function openPlan(label: string, items: TermItem[]) {
    setPlanFor({ label, items });
    setPlan("");
    setGenerating(true);
    try {
      const res = await aiChatOnce(
        plannerMessages({
          tasks: items.map(toTask),
          hoursPerDay: 2,
          studyDays: "weekdays",
          now,
        }),
        "auto",
      );
      setPlan(res.text);
    } catch (e) {
      toast({ title: "Plan failed", description: (e as Error).message, variant: "danger" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Semester</h2>
          <p className="text-muted text-sm">
            Your term at a glance — Blackboard deadlines plus your own tasks.
          </p>
        </div>
        <Link href="/study" className="text-muted hover:text-foreground text-xs transition-colors">
          Open study planner
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={<CalendarRange />}
          title="Nothing on your term yet"
          description="Add tasks with due dates, or connect your Blackboard feed in Tasks to see your deadlines plotted by week."
          action={
            <Link
              href="/tasks"
              className="bg-surface-2 text-foreground hover:bg-surface-2/80 inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors"
            >
              Go to Tasks
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {weeks.map((week) => {
            const items = termItemsForWeek(week, tasks, events, now);
            const label = `${formatDate(week.start, {
              month: "short",
              day: "numeric",
            })} – ${formatDate(week.end - DAY_MS, { month: "short", day: "numeric" })}`;
            return (
              <Card key={week.start} className="flex flex-col">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{label}</CardTitle>
                  {items.length > 0 ? (
                    <span className="text-muted font-mono text-xs">{items.length}</span>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="text-muted py-3 text-xs">No deadlines</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {items.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              item.source === "blackboard"
                                ? item.risk === "Critical" || item.risk === "High"
                                  ? "bg-danger"
                                  : "bg-warning"
                                : item.priority === "P0"
                                  ? "bg-danger"
                                  : item.priority === "P1"
                                    ? "bg-warning"
                                    : "bg-muted",
                            )}
                            aria-hidden
                          />
                          <span className="text-foreground min-w-0 truncate">{item.title}</span>
                          {item.risk ? (
                            <span className="text-muted shrink-0">{item.risk}</span>
                          ) : null}
                        </div>
                      ))}
                      {items.length > 4 ? (
                        <span className="text-muted text-[11px]">+{items.length - 4} more</span>
                      ) : null}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-auto"
                    disabled={items.length === 0}
                    onClick={() => void openPlan(label, items)}
                  >
                    <Sparkles />
                    Plan week
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={planFor != null} onOpenChange={(open) => !open && setPlanFor(null)}>
        <DialogContent className="max-h-[80dvh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Plan for {planFor?.label}</DialogTitle>
            <DialogDescription>
              {planFor?.items.length ?? 0} deadline{planFor?.items.length === 1 ? "" : "s"} ·
              generated from your workload.
            </DialogDescription>
          </DialogHeader>
          {generating ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : plan ? (
            <MarkdownPreview content={plan} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
