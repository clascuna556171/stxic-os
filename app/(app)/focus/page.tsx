"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { listFocusSessions, listTasks, saveFocusSession } from "@/lib/hydrate";
import {
  DEFAULT_DURATIONS,
  FOCUS_PRESETS,
  formatDuration,
  weeklyFocusStat,
  type FocusMode,
  type WeeklyFocusStat,
} from "@/lib/focus";
import { cn } from "@/lib/utils/cn";
import type { FocusSession, TaskItem } from "@/types";

export default function FocusPage() {
  const [durations, setDurations] = useState(DEFAULT_DURATIONS);
  const [mode, setMode] = useState<FocusMode>("focus");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.focus * 60);
  const [sessionSeconds, setSessionSeconds] = useState(DEFAULT_DURATIONS.focus * 60);
  const [taskId, setTaskId] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stat, setStat] = useState<WeeklyFocusStat>({
    totalSeconds: 0,
    totalMinutes: 0,
    sessions: 0,
  });
  const sessionsRef = useRef<FocusSession[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [sessRes, taskRes] = await Promise.all([listFocusSessions(), listTasks()]);
      if (cancelled) return;
      if (sessRes.ok) {
        sessionsRef.current = sessRes.data;
        setStat(weeklyFocusStat(sessRes.data));
      }
      if (taskRes.ok) setTasks(taskRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || secondsLeft > 0) return;
    const duration = sessionSeconds;
    const bound = taskId || undefined;
    void (async () => {
      const session: FocusSession = {
        id: crypto.randomUUID(),
        taskId: bound,
        start: Date.now() - duration * 1000,
        duration,
        createdAt: Date.now(),
      };
      const res = await saveFocusSession(session);
      if (res.ok) {
        sessionsRef.current = [...sessionsRef.current, session];
        setStat(weeklyFocusStat(sessionsRef.current));
        toast({ title: "Focus session logged", variant: "success" });
      } else {
        toast({ title: "Couldn't log session", description: res.error, variant: "danger" });
      }
      setRunning(false);
    })();
  }, [running, secondsLeft, sessionSeconds, taskId]);

  function selectMode(m: FocusMode) {
    if (m === mode) return;
    setMode(m);
    setRunning(false);
    const total = durations[m] * 60;
    setSecondsLeft(total);
    setSessionSeconds(total);
  }

  function toggleRun() {
    if (running) {
      setRunning(false);
      return;
    }
    if (secondsLeft <= 0) {
      const total = durations[mode] * 60;
      setSecondsLeft(total);
      setSessionSeconds(total);
    }
    setRunning(true);
  }

  function reset() {
    setRunning(false);
    const total = durations[mode] * 60;
    setSecondsLeft(total);
    setSessionSeconds(total);
  }

  function setDuration(m: FocusMode, value: string) {
    const mins = Number(value);
    if (!Number.isFinite(mins) || mins < 1) return;
    setDurations((d) => ({ ...d, [m]: Math.min(120, Math.floor(mins)) }));
    if (!running && m === mode) {
      setSecondsLeft(Math.min(120, Math.floor(mins)) * 60);
      setSessionSeconds(Math.min(120, Math.floor(mins)) * 60);
    }
  }

  const progress = sessionSeconds > 0 ? 1 - secondsLeft / sessionSeconds : 0;
  const openTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Focus</h2>
        <p className="text-muted text-sm">
          Pomodoro timer · logs sessions · weekly stat on the dashboard.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="flex flex-col items-center gap-6 p-8">
          <div className="flex flex-wrap justify-center gap-1">
            {FOCUS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectMode(p.id)}
                className={cn(
                  "text-muted hover:text-foreground rounded-lg px-3 py-1.5 text-sm transition-colors",
                  mode === p.id && "bg-surface-2 text-foreground font-medium",
                )}
              >
                {p.label} · {durations[p.id]}m
              </button>
            ))}
          </div>

          <ProgressRing
            value={progress}
            size={200}
            strokeWidth={10}
            label={formatDuration(secondsLeft)}
          />

          <div className="flex items-center gap-2">
            <Button variant="primary" size="lg" onClick={toggleRun}>
              {running ? <Pause /> : <Play />}
              {running ? "Pause" : secondsLeft <= 0 ? "Start" : "Resume"}
            </Button>
            <Button variant="secondary" size="lg" onClick={reset} aria-label="Reset timer">
              <RotateCcw />
            </Button>
          </div>

          <div className="w-full max-w-sm">
            <Label htmlFor="focus-task">Focus on task (optional)</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger id="focus-task">
                <SelectValue placeholder="No task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No task</SelectItem>
                {openTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>This week</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="bg-surface-2 text-accent flex size-12 items-center justify-center rounded-full">
                <Flame className="size-6" />
              </div>
              <div>
                <p className="text-foreground font-mono text-2xl font-semibold">
                  {stat.totalMinutes}m
                </p>
                <p className="text-muted text-sm">
                  {stat.sessions} session{stat.sessions === 1 ? "" : "s"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Durations</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {FOCUS_PRESETS.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`dur-${p.id}`} className="mb-0">
                    {p.label}
                  </Label>
                  <Input
                    id={`dur-${p.id}`}
                    type="number"
                    min={1}
                    max={120}
                    value={durations[p.id]}
                    onChange={(e) => setDuration(p.id, e.target.value)}
                    className="w-20 text-right"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
