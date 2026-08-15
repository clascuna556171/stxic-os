"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Send, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { streamAiChat } from "@/lib/ai/client";
import { cn } from "@/lib/utils/cn";
import type { AiProvider, ChatMessage } from "@/lib/ai/types";

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
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<AiProvider>("auto");
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamingId(null);
  }

  function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UiMessage = { id: assistantId, role: "assistant", content: "" };

    const history: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setStreaming(true);
    setStreamingId(assistantId);

    const controller = new AbortController();
    abortRef.current = controller;

    void streamAiChat(
      history,
      provider,
      {
        onDelta: (t, p) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + t, provider: p ?? msg.provider }
                : msg,
            ),
          );
        },
        onDone: (ev) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId
                ? { ...msg, provider: ev.provider, fallback: ev.fallback }
                : msg,
            ),
          );
          setStreaming(false);
          setStreamingId(null);
        },
        onError: (err) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantId && !msg.content
                ? { ...msg, content: "Something went wrong.", fallback: true }
                : msg,
            ),
          );
          setStreaming(false);
          setStreamingId(null);
          toast({ title: "Chat error", description: err, variant: "danger" });
        },
      },
      controller.signal,
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
          <h2 className="text-foreground text-xl font-semibold tracking-tight">AI chat</h2>
          <p className="text-muted text-sm">Local Ollama first, Groq cloud fallback.</p>
        </div>
        <div className="flex gap-1">
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
        </div>
      </header>

      <div className="border-border bg-surface flex min-h-[60dvh] flex-col overflow-hidden rounded-xl border">
        <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="bg-surface-2 text-accent flex size-12 items-center justify-center rounded-full">
                <Sparkles className="size-6" />
              </div>
              <p className="text-foreground text-sm font-medium">Ask anything</p>
              <p className="text-muted max-w-sm text-sm">
                Your prompts are sent to your chosen model — never your vault or passwords.
              </p>
            </div>
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
                      : "bg-surface-2 text-foreground",
                  )}
                >
                  {msg.role === "assistant" && msg.id === streamingId ? (
                    <span className="whitespace-pre-wrap">
                      {msg.content}
                      <span className="text-muted animate-pulse motion-reduce:animate-none">▍</span>
                    </span>
                  ) : msg.role === "assistant" ? (
                    <MarkdownPreview content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && msg.provider ? (
                  <span className="text-muted px-1 text-[11px]">
                    via {PROVIDER_LABEL[msg.provider] ?? msg.provider}
                    {msg.fallback ? " · fallback" : ""}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="border-border flex items-end gap-2 border-t p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message your AI…"
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
