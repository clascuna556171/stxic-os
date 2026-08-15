"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { aiChatOnce } from "@/lib/ai/client";
import { plannerMessages, type StudyDays } from "@/lib/ai/planner";
import { listTasks } from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";
import type { TaskItem } from "@/types";

const MarkdownPreview = dynamic(
  () => import("@/components/features/notes/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

const DAY_OPTIONS: { id: StudyDays; label: string }[] = [
  { id: "weekdays", label: "Weekdays" },
  { id: "everyday", label: "Every day" },
];

export default function StudyPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [hours, setHours] = useState("2");
  const [days, setDays] = useState<StudyDays>("weekdays");
  const [plan, setPlan] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listTasks();
      if (cancelled) return;
      if (res.ok) setTasks(res.data);
      setLoadingTasks(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  async function generate() {
    const hrs = Math.min(16, Math.max(0.5, Number.parseFloat(hours) || 2));
    setGenerating(true);
    try {
      const res = await aiChatOnce(
        plannerMessages({ tasks: openTasks, hoursPerDay: hrs, studyDays: days, now: Date.now() }),
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
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Study planner</h2>
          <p className="text-muted text-sm">Turn your open assignments into a 7-day schedule.</p>
        </div>
        <Link href="/tasks" className="text-muted hover:text-foreground text-xs transition-colors">
          View tasks
        </Link>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Your week</CardTitle>
            <CardDescription>
              {loadingTasks
                ? "Loading your tasks…"
                : `Planning around ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"}.`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-xs">Hours per day</span>
            <Input
              type="number"
              min={0.5}
              max={16}
              step={0.5}
              inputMode="decimal"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-28"
              aria-label="Hours per day"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-muted text-xs">Study days</span>
            <div className="flex gap-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDays(d.id)}
                  className={cn(
                    "text-muted hover:text-foreground rounded-lg px-3 py-1.5 text-sm transition-colors",
                    days === d.id && "bg-surface-2 text-foreground font-medium",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => void generate()}
            disabled={generating || loadingTasks || openTasks.length === 0}
          >
            <Sparkles className={cn(generating && "animate-pulse motion-reduce:animate-none")} />
            {plan ? "Regenerate" : "Generate plan"}
          </Button>
        </CardContent>
      </Card>

      {loadingTasks ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : openTasks.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title="No open tasks"
          description="Add assignments or tasks with due dates in Tasks, then come back to plan your week."
          action={
            <Link
              href="/tasks"
              className="bg-surface-2 text-foreground hover:bg-surface-2/80 inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors"
            >
              Go to Tasks
            </Link>
          }
        />
      ) : generating ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/6" />
        </div>
      ) : plan ? (
        <Card>
          <CardContent>
            <MarkdownPreview content={plan} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<Sparkles />}
          title="Ready when you are"
          description="Set your available time above and generate a day-by-day plan from your open tasks."
        />
      )}
    </div>
  );
}
