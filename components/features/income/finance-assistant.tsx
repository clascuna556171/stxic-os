"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { parseActionFromLlmResponse, parseAiAction, type AiAction } from "@/lib/ai/actions";
import { executeAiAction, type ActionCandidate, type ExecutionResult } from "@/lib/ai/executor";
import { ActionCard } from "@/components/features/ai/action-card";
import { streamAiChat } from "@/lib/ai/client";
import { financeAssistantPrompt } from "@/lib/ai/prompts";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "@/lib/ai/types";
import type { Currency, SavingsGoal } from "@/types";

const MarkdownPreview = dynamic(
  () => import("@/components/features/notes/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full" /> },
);

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  execution?: ExecutionResult;
}

const FINANCE_KINDS: AiAction["kind"][] = [
  "income",
  "expense",
  "savingsGoal",
  "account",
  "addToSavings",
];

export function FinanceAssistant({
  defaultCurrency,
  context,
  goals: _goals,
  onChanged,
}: {
  defaultCurrency: Currency;
  context: string;
  goals: SavingsGoal[];
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  async function handleCandidateSelect(candidate: ActionCandidate, msgId: string) {
    if (candidate.kind !== "addToSavings") return;
    const action: AiAction = {
      kind: "addToSavings",
      name: candidate.name,
      amount: 5000,
      currency: defaultCurrency,
    };

    const result = await executeAiAction(action, "", defaultCurrency);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              content: result.ok ? `Selected ${candidate.name}.` : m.content,
              execution: result,
            }
          : m,
      ),
    );

    if (result.ok) {
      toast({ title: result.described, variant: "success" });
      onChanged();
    } else {
      toast({ title: "Action failed", description: result.error, variant: "danger" });
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);

    const action = parseAiAction(text, defaultCurrency);

    if (action) {
      if (!FINANCE_KINDS.includes(action.kind)) {
        setMessages((m) =>
          m.map((x) =>
            x.id === assistantId
              ? {
                  ...x,
                  content:
                    "I only manage finance here — tasks, habits, and notes can be created in the main AI chat or their pages. Try `add 5k at the savings` or `log expense lunch 250`.",
                }
              : x,
          ),
        );
        return;
      }

      const result = await executeAiAction(action, text, defaultCurrency);
      setMessages((m) =>
        m.map((x) =>
          x.id === assistantId
            ? {
                ...x,
                content: result.ok ? "" : result.described || "Could not execute action.",
                execution: result,
              }
            : x,
        ),
      );

      if (result.ok) {
        toast({ title: result.described, variant: "success" });
        onChanged();
      } else if (result.error) {
        toast({ title: "Action failed", description: result.error, variant: "danger" });
      }
      return;
    }

    const history: ChatMessage[] = [
      { role: "system", content: financeAssistantPrompt(context) },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let accumulatedText = "";

    void streamAiChat(
      history,
      "auto",
      {
        onDelta: (t) => {
          accumulatedText += t;
          setMessages((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, content: accumulatedText } : x)),
          );
        },
        onDone: async () => {
          setStreaming(false);

          const { cleanText, action: llmAction } = parseActionFromLlmResponse(accumulatedText);
          let executionResult: ExecutionResult | undefined;

          if (llmAction && FINANCE_KINDS.includes(llmAction.kind)) {
            executionResult = await executeAiAction(llmAction, text, defaultCurrency);
            if (executionResult.ok) {
              toast({ title: executionResult.described, variant: "success" });
              onChanged();
            } else if (executionResult.error) {
              toast({
                title: "Action failed",
                description: executionResult.error,
                variant: "danger",
              });
            }
          }

          setMessages((m) =>
            m.map((x) =>
              x.id === assistantId
                ? {
                    ...x,
                    content: cleanText,
                    execution: executionResult,
                  }
                : x,
            ),
          );
        },
        onError: (err) => {
          setMessages((m) =>
            m.map((x) =>
              x.id === assistantId && !x.content
                ? { ...x, content: "Something went wrong." }
                : x,
            ),
          );
          setStreaming(false);
          toast({ title: "Chat error", description: err, variant: "danger" });
        },
      },
      { signal: controller.signal, reasoning: "hidden" },
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card className="flex h-[520px] flex-col">
      <CardHeader className="pb-2">
        <CardTitle>Finance assistant</CardTitle>
        <CardDescription>
          Try &ldquo;add 5000 at the savings&rdquo;, &ldquo;log expense lunch 250&rdquo;, &ldquo;record income 3000&rdquo;, or &ldquo;add account: GCash 2500&rdquo;.
        </CardDescription>
      </CardHeader>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <p className="text-muted px-2 py-10 text-center text-sm">
            Ask me anything about your money — or tell me to top up savings, log an expense, income, or account.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col gap-1", msg.role === "user" && "items-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-accent text-accent-fg"
                    : "border-border/70 bg-surface-2 text-foreground border",
                )}
              >
                {msg.role === "assistant" ? (
                  <>
                    {msg.content ? <MarkdownPreview content={msg.content} /> : null}
                    {msg.execution ? (
                      <ActionCard
                        action={msg.execution.action}
                        described={msg.execution.described}
                        itemId={msg.execution.itemId}
                        itemTitle={msg.execution.itemTitle}
                        itemHref={msg.execution.itemHref}
                        snapshot={msg.execution.snapshot}
                        candidates={msg.execution.candidates}
                        onSelectCandidate={(cand) => handleCandidateSelect(cand, msg.id)}
                        onUndone={onChanged}
                      />
                    ) : null}
                    {streaming && msg.id === messages[messages.length - 1]?.id ? (
                      <span className="text-muted animate-pulse motion-reduce:animate-none">▍</span>
                    ) : null}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-border flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about your money, add savings, log expenses…"
          rows={1}
          className="max-h-32 min-h-0 resize-none py-2.5"
          aria-label="Finance assistant message"
        />
        {streaming ? (
          <Button variant="secondary" size="icon" onClick={stop} aria-label="Stop generating">
            <Square />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="icon"
            onClick={send}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <Send />
          </Button>
        )}
      </div>
    </Card>
  );
}
