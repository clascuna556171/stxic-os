"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Send, Square, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { describeAction, parseAiAction, type AiAction } from "@/lib/ai/actions";
import { streamAiChat } from "@/lib/ai/client";
import { financeAssistantPrompt } from "@/lib/ai/prompts";
import {
  deleteAccount,
  deleteSavingsGoal,
  deleteTransaction,
  saveAccount,
  saveSavingsGoal,
  saveTransaction,
} from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage } from "@/lib/ai/types";
import type { Currency, FinanceAccount, SavingsGoal, Transaction } from "@/types";

const MarkdownPreview = dynamic(
  () => import("@/components/features/notes/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false, loading: () => <Skeleton className="h-24 w-full" /> },
);

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: { kind: AiAction["kind"]; id: string };
}

const FINANCE_KINDS: AiAction["kind"][] = ["income", "expense", "savingsGoal", "account"];

export function FinanceAssistant({
  defaultCurrency,
  onChanged,
}: {
  defaultCurrency: Currency;
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

  async function undo(msg: Msg) {
    if (!msg.action) return;
    const { kind, id } = msg.action;
    const res =
      kind === "income" || kind === "expense"
        ? await deleteTransaction(id)
        : kind === "savingsGoal"
          ? await deleteSavingsGoal(id)
          : await deleteAccount(id);
    if (res.ok) {
      setMessages((m) => m.filter((x) => x.id !== msg.id));
      toast({ title: "Undone", description: "The entry was removed." });
      onChanged();
    } else {
      toast({ title: "Couldn't undo", description: res.error, variant: "danger" });
    }
  }

  function send() {
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
              ? { ...x, content: "I only manage finance here — tasks and notes have their own pages. Try `log expense lunch 250`." }
              : x,
          ),
        );
        return;
      }

      const now = Date.now();
      void (async () => {
        let res: { ok: boolean; error?: string } | null = null;
        let createdId = "";
        try {
          if (action.kind === "income" || action.kind === "expense") {
            const item: Transaction = {
              id: crypto.randomUUID(),
              type: action.kind,
              label: action.label,
              amount: action.amount,
              currency: action.currency,
              category: action.category,
              date: now,
              createdAt: now,
              updatedAt: now,
            };
            res = await saveTransaction(item);
            createdId = item.id;
          } else if (action.kind === "savingsGoal") {
            const item: SavingsGoal = {
              id: crypto.randomUUID(),
              name: action.name,
              target: action.target,
              saved: action.saved,
              currency: action.currency,
              deadline: action.deadline,
              createdAt: now,
              updatedAt: now,
            };
            res = await saveSavingsGoal(item);
            createdId = item.id;
          } else if (action.kind === "account") {
            const item: FinanceAccount = {
              id: crypto.randomUUID(),
              name: action.name,
              kind: action.accountKind,
              currency: action.currency,
              balance: action.balance,
              createdAt: now,
              updatedAt: now,
            };
            res = await saveAccount(item);
            createdId = item.id;
          }
        } catch (e) {
          res = { ok: false, error: (e as Error).message };
        }

        if (res?.ok) {
          setMessages((m) =>
            m.map((x) =>
              x.id === assistantId
                ? { ...x, content: describeAction(action), action: { kind: action.kind, id: createdId } }
                : x,
            ),
          );
          toast({ title: `Added ${action.kind}`, description: describeAction(action), variant: "success" });
          onChanged();
        } else {
          setMessages((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, content: "Couldn't create that." } : x)),
          );
          toast({ title: "Action failed", description: res?.error ?? "Unknown error", variant: "danger" });
        }
      })();
      return;
    }

    const history: ChatMessage[] = [
      { role: "system", content: financeAssistantPrompt() },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    void streamAiChat(
      history,
      "auto",
      {
        onDelta: (t) => {
          setMessages((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, content: x.content + t } : x)),
          );
        },
        onDone: () => setStreaming(false),
        onError: (err) => {
          setMessages((m) =>
            m.map((x) =>
              x.id === assistantId && !x.content
                ? { ...x, content: "Something went wrong.", streaming: true }
                : x,
            ),
          );
          setStreaming(false);
          toast({ title: "Chat error", description: err, variant: "danger" });
        },
      },
      { signal: controller.signal, reasoning: "none" },
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
          Try “log expense lunch 250”, “record income 3000”, “add savings goal: new laptop target 60000”, or “add account: GCash 2500”.
        </CardDescription>
      </CardHeader>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <p className="text-muted px-2 py-10 text-center text-sm">
            Ask me anything about your money — or just tell me to log an expense, income, savings goal, or account.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col gap-1", msg.role === "user" && "items-end")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-accent text-accent-fg"
                    : msg.action
                      ? "border-success/40 bg-success/10 text-foreground border"
                      : "bg-surface-2 text-foreground",
                )}
              >
                {msg.action ? (
                  <div className="flex items-center gap-2">
                    <Check className="text-success size-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-medium">Added · {msg.content}</p>
                      <p className="text-muted text-xs">Saved to your finance records.</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void undo(msg)}
                      className="shrink-0"
                    >
                      <Undo2 />
                      Undo
                    </Button>
                  </div>
                ) : msg.role === "assistant" ? (
                  <>
                    <MarkdownPreview content={msg.content || "…"} />
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
          placeholder="Ask about your money…"
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
