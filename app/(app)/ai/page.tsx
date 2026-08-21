"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Brain, Send, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { streamAiChat } from "@/lib/ai/client";
import { parseActionFromLlmResponse, parseAiAction, type AiAction } from "@/lib/ai/actions";
import { executeAiAction, type ActionCandidate, type ExecutionResult } from "@/lib/ai/executor";
import { ActionCard } from "@/components/features/ai/action-card";
import { aiChatSystemPrompt } from "@/lib/ai/prompts";
import {
  getSettings,
  listAccounts,
  listHabits,
  listNotes,
  listSavingsGoals,
  listTasks,
} from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";
import type { AiProvider, ChatMessage } from "@/lib/ai/types";
import type { Currency } from "@/types";

const MarkdownPreview = dynamic(
  () => import("@/components/features/notes/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

const PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "ollama", label: "Ollama" },
  { id: "groq", label: "Groq" },
];

const PROVIDER_LABEL: Record<string, string> = { ollama: "Ollama", groq: "Groq" };

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  fallback?: boolean;
  execution?: ExecutionResult;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<AiProvider>("auto");
  const [reasoning, setReasoning] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("PHP");
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  useEffect(() => {
    void getSettings().then((res) => {
      if (res.ok) setDefaultCurrency(res.data.defaultCurrency);
    });
  }, []);

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamingId(null);
  }

  async function buildContextSummary(): Promise<string> {
    try {
      const [tasksRes, goalsRes, accountsRes, habitsRes, notesRes] = await Promise.all([
        listTasks(),
        listSavingsGoals(),
        listAccounts(),
        listHabits(),
        listNotes(),
      ]);

      const parts: string[] = [];

      if (tasksRes.ok && tasksRes.data.length > 0) {
        const open = tasksRes.data.filter((t) => t.status !== "done");
        const list = open
          .slice(0, 5)
          .map((t) => `• [${t.priority}] ${t.title}`)
          .join("\n");
        parts.push(`Open Tasks (${open.length}):\n${list || "None"}`);
      }

      if (goalsRes.ok && goalsRes.data.length > 0) {
        const list = goalsRes.data
          .map((g) => `• ${g.name}: ${g.saved} / ${g.target} ${g.currency}`)
          .join("\n");
        parts.push(`Savings Goals (${goalsRes.data.length}):\n${list}`);
      } else {
        parts.push(`Savings Goals: None currently configured.`);
      }

      if (accountsRes.ok && accountsRes.data.length > 0) {
        const list = accountsRes.data
          .map((a) => `• ${a.name} (${a.kind}): ${a.balance} ${a.currency}`)
          .join("\n");
        parts.push(`Accounts:\n${list}`);
      }

      if (habitsRes.ok && habitsRes.data.length > 0) {
        const list = habitsRes.data
          .map((h) => `• ${h.emoji ? h.emoji + " " : ""}${h.name} (${h.streak}-day streak)`)
          .join("\n");
        parts.push(`Habits:\n${list}`);
      }

      if (notesRes.ok && notesRes.data.length > 0) {
        const titles = notesRes.data.slice(0, 5).map((n) => `"${n.title}"`).join(", ");
        parts.push(`Notes: ${notesRes.data.length} total (${titles})`);
      }

      return parts.join("\n\n");
    } catch {
      return "";
    }
  }

  async function handleCandidateSelect(candidate: ActionCandidate, msgId: string) {
    let action: AiAction | null = null;
    if (candidate.kind === "addToSavings") {
      action = { kind: "addToSavings", name: candidate.name, amount: 5000, currency: defaultCurrency };
    } else if (candidate.kind === "completeTask") {
      action = { kind: "completeTask", query: candidate.name, taskId: candidate.id };
    } else if (candidate.kind === "checkHabit") {
      action = { kind: "checkHabit", query: candidate.name, habitId: candidate.id };
    }

    if (!action) return;

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
    } else {
      toast({ title: "Action failed", description: result.error, variant: "danger" });
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    const directAction = parseAiAction(text, defaultCurrency);

    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);

    // Deterministic fast path -> execute real action directly
    if (directAction) {
      const result = await executeAiAction(directAction, text, defaultCurrency);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: result.ok ? "" : result.described || "Could not complete action.",
                execution: result,
              }
            : msg,
        ),
      );

      if (result.ok) {
        toast({ title: result.described, variant: "success" });
      } else if (result.error) {
        toast({ title: "Action failed", description: result.error, variant: "danger" });
      }
      return;
    }

    // Model path -> prompt LLM with current workspace context
    const contextSummary = await buildContextSummary();
    const systemPrompt = aiChatSystemPrompt(contextSummary);

    const history: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    setStreaming(true);
    setStreamingId(assistantId);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulatedText = "";

    void streamAiChat(
      history,
      provider,
      {
        onDelta: (t, p) => {
          accumulatedText += t;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: accumulatedText, provider: p ?? msg.provider }
                : msg,
            ),
          );
        },
        onDone: async (ev) => {
          setStreaming(false);
          setStreamingId(null);

          // Check if the LLM output contained a structured action
          const { cleanText, action } = parseActionFromLlmResponse(accumulatedText);
          let executionResult: ExecutionResult | undefined;

          if (action) {
            executionResult = await executeAiAction(action, text, defaultCurrency);
            if (executionResult.ok) {
              toast({ title: executionResult.described, variant: "success" });
            } else if (executionResult.error) {
              toast({
                title: "Action failed",
                description: executionResult.error,
                variant: "danger",
              });
            }
          }

          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: cleanText,
                    provider: ev.provider,
                    fallback: ev.fallback,
                    execution: executionResult,
                  }
                : msg,
            ),
          );
        },
        onError: (err) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId && !msg.content
                ? { ...msg, content: "Something went wrong reaching the AI model.", fallback: true }
                : msg,
            ),
          );
          setStreaming(false);
          setStreamingId(null);
          toast({ title: "Chat error", description: err, variant: "danger" });
        },
      },
      { signal: controller.signal, reasoning: reasoning ? "raw" : "hidden" },
    );
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">AI Assistant</h2>
          <p className="text-muted text-sm">
            Manage your finances, tasks, habits, and notes with intelligent actions.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={cn(
                "text-muted hover:text-foreground rounded-lg px-3 py-1.5 text-sm transition-colors",
                provider === p.id && "bg-surface-2 text-foreground font-medium",
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="bg-border mx-1 h-4 w-px" aria-hidden />
          <button
            type="button"
            onClick={() => setReasoning((r) => !r)}
            aria-pressed={reasoning}
            title={
              reasoning ? "Thinking shown — replies may be slower" : "Thinking on, hidden — better answers"
            }
            aria-label="Toggle thinking"
            className={cn(
              "text-muted hover:text-foreground rounded-lg p-1.5 transition-colors",
              reasoning && "bg-surface-2 text-accent",
            )}
          >
            <Brain className="size-4" />
          </button>
        </div>
      </header>

      <div className="border-border bg-surface flex min-h-[65dvh] flex-col overflow-hidden rounded-xl border shadow-sm">
        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="bg-surface-2 text-accent flex size-12 items-center justify-center rounded-full shadow-inner">
                <Sparkles className="size-6" />
              </div>
              <div>
                <p className="text-foreground text-base font-semibold">How can I help you today?</p>
                <p className="text-muted mt-1 max-w-md text-xs leading-relaxed">
                  Try asking &ldquo;Add 5000 at the savings&rdquo;, &ldquo;Spent 350 on groceries&rdquo;, &ldquo;Add
                  P0 task: Finish CS project&rdquo;, or &ldquo;Check in reading habit&rdquo;.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-1.5", msg.role === "user" && "items-end")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm",
                    msg.role === "user"
                      ? "bg-accent text-accent-fg"
                      : "border-border/70 bg-surface-2/90 text-foreground border",
                  )}
                >
                  {msg.role === "assistant" && msg.id === streamingId ? (
                    <span className="whitespace-pre-wrap">
                      {msg.content}
                      <span className="text-muted animate-pulse motion-reduce:animate-none">▍</span>
                    </span>
                  ) : (
                    <>
                      {msg.content ? (
                        msg.role === "assistant" ? (
                          <MarkdownPreview content={msg.content} />
                        ) : (
                          msg.content
                        )
                      ) : null}

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
                        />
                      ) : null}
                    </>
                  )}
                </div>
                {msg.role === "assistant" && (msg.provider || msg.execution) ? (
                  <span className="text-muted px-1.5 text-[11px]">
                    {msg.execution?.ok
                      ? "· action executed"
                      : msg.provider
                        ? `via ${PROVIDER_LABEL[msg.provider] ?? msg.provider}`
                        : ""}
                    {msg.provider && msg.fallback ? " · fallback" : ""}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="border-border bg-surface/50 flex items-end gap-2 border-t p-3 backdrop-blur-sm">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tell your AI to add savings, log expenses, create tasks, check habits…"
            rows={1}
            className="max-h-40 min-h-0 resize-none py-2.5"
            aria-label="Chat message"
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
      </div>
    </div>
  );
}
