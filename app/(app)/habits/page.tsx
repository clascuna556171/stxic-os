"use client";

import { useEffect, useState } from "react";
import { Check, Flame, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { deleteHabit, listHabits, saveHabit } from "@/lib/hydrate";
import { aiChatOnce } from "@/lib/ai/client";
import { currentStreak, dayKey, habitNudgeMessages, toggleCompletion, weekLog } from "@/lib/habits";
import { cn } from "@/lib/utils/cn";
import type { Habit } from "@/types";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [nudge, setNudge] = useState<Record<string, string>>({});
  const [nudging, setNudging] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listHabits();
      if (cancelled) return;
      if (res.ok) setHabits(res.data);
      setNow(Date.now());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addHabit() {
    const n = name.trim();
    if (!n) return;
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: n,
      emoji: emoji.trim() || undefined,
      streak: 0,
      log: {},
      createdAt: Date.now(),
    };
    const res = await saveHabit(habit);
    if (!res.ok) {
      toast({ title: "Couldn't add habit", description: res.error, variant: "danger" });
      return;
    }
    setHabits((h) => [...h, habit]);
    setName("");
    setEmoji("");
  }

  async function toggle(habit: Habit) {
    const next = toggleCompletion(habit, now);
    setHabits((h) => h.map((x) => (x.id === habit.id ? next : x)));
    const res = await saveHabit(next);
    if (!res.ok) {
      setHabits((h) => h.map((x) => (x.id === habit.id ? habit : x)));
      toast({ title: "Couldn't update", description: res.error, variant: "danger" });
    }
  }

  async function remove(id: string) {
    setHabits((h) => h.filter((x) => x.id !== id));
    const res = await deleteHabit(id);
    if (!res.ok) toast({ title: "Couldn't delete", description: res.error, variant: "danger" });
  }

  async function nudgeHabit(habit: Habit) {
    if (nudging) return;
    setNudging(habit.id);
    try {
      const res = await aiChatOnce(habitNudgeMessages(habit), "auto");
      setNudge((n) => ({ ...n, [habit.id]: res.text }));
    } catch (e) {
      toast({ title: "Nudge failed", description: (e as Error).message, variant: "danger" });
    } finally {
      setNudging(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Habits</h2>
        <p className="text-muted text-sm">Daily streaks with a little AI encouragement.</p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5 sm:flex-1">
          <label htmlFor="habit-name" className="text-muted text-xs">
            New habit
          </label>
          <Input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addHabit();
            }}
            placeholder="e.g. Morning run"
            className="w-full sm:w-56"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="habit-emoji" className="text-muted text-xs">
            Emoji
          </label>
          <Input
            id="habit-emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="🏃"
            className="w-full sm:w-16"
          />
        </div>
        <Button
          variant="primary"
          className="w-full sm:w-auto"
          onClick={() => void addHabit()}
          disabled={!name.trim()}
        >
          <Plus />
          Add
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={<Flame />}
          title="No habits yet"
          description="Add one above and check it off daily to build a streak."
        />
      ) : (
        <div className="border-border divide-y rounded-lg border">
          {habits.map((habit) => {
            const streak = currentStreak(habit.log, now);
            const done = habit.log[dayKey(now)] === true;
            return (
              <div key={habit.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span aria-hidden>{habit.emoji}</span>
                    <span className="text-foreground text-sm font-medium">{habit.name}</span>
                    {streak > 0 ? (
                      <Badge variant="warning">
                        <Flame className="size-3.5" />
                        {streak} day{streak === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {weekLog(habit.log, now).map((on, i) => (
                      <span
                        key={i}
                        className={cn("size-2 rounded-full", on ? "bg-accent" : "bg-surface-2")}
                        aria-hidden
                      />
                    ))}
                  </div>
                  {nudge[habit.id] ? (
                    <p className="text-muted mt-2 text-sm">{nudge[habit.id]}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant={done ? "primary" : "secondary"}
                    size="icon"
                    aria-label={done ? "Mark not done" : "Mark done today"}
                    onClick={() => void toggle(habit)}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="AI nudge"
                    disabled={nudging === habit.id}
                    onClick={() => void nudgeHabit(habit)}
                  >
                    <Sparkles
                      className={cn(
                        "size-4",
                        nudging === habit.id &&
                          "text-accent animate-pulse motion-reduce:animate-none",
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete habit"
                    onClick={() => void remove(habit.id)}
                  >
                    <Trash2 className="text-muted size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
