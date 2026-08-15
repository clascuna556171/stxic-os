"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { aiChatOnce } from "@/lib/ai/client";
import { digestMessages, parseTopPriorities, stripJsonBlock } from "@/lib/ai/digest";
import type { Habit, TaskItem } from "@/types";

const MarkdownPreview = dynamic(
  () => import("@/components/features/notes/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

export function DigestCard({
  tasks,
  habits,
  focusMinutes,
}: {
  tasks: TaskItem[];
  habits: Habit[];
  focusMinutes: number;
}) {
  const [text, setText] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await aiChatOnce(
        digestMessages({ tasks, habits, focusMinutes, now: Date.now() }),
        "auto",
      );
      setText(res.text);
      setPriorities(parseTopPriorities(res.text));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Daily digest</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => void generate()} disabled={loading}>
          <Sparkles />
          {text ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error ? (
          <p className="text-danger text-sm">{error}</p>
        ) : text ? (
          <div className="flex flex-col gap-3">
            {priorities.length > 0 ? (
              <div className="border-border rounded-lg border p-3">
                <p className="text-foreground mb-1.5 text-sm font-medium">Top 3 priorities</p>
                <ul className="list-inside list-disc space-y-1">
                  {priorities.map((p, i) => (
                    <li key={i} className="text-foreground text-sm">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <MarkdownPreview content={stripJsonBlock(text)} />
          </div>
        ) : (
          <p className="text-muted text-sm">
            Generate a short briefing from your open tasks, habit streaks, and focus time this week.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
