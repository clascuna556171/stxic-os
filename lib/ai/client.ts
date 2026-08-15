/**
 * Stxic AI client — consumes the `/api/ai/chat` SSE stream from the browser.
 * Pure SSE parsing is exposed as `parseSseLine` for unit tests. Client-side
 * only (never imports the server providers, so keys stay server-side).
 */

import type { AiProvider, ChatMessage, ChatStreamEvent } from "./types";

/** Parse a single `data: {...}` SSE line into an event, or null. */
export function parseSseLine(line: string): ChatStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    const json = JSON.parse(payload) as ChatStreamEvent;
    if (!json || typeof json.type !== "string") return null;
    return json;
  } catch {
    return null;
  }
}

/** POST to the chat endpoint and yield parsed SSE events. */
export async function* requestAiStream(
  messages: ChatMessage[],
  provider: AiProvider,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, provider }),
    signal,
  });

  if (!res.ok) {
    yield { type: "error", error: `Request failed (${res.status})` };
    return;
  }
  if (!res.body) {
    yield { type: "error", error: "Empty response" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      for (const line of block.split("\n")) {
        const event = parseSseLine(line);
        if (event) yield event;
      }
    }
  }
}

export interface StreamHandlers {
  onDelta?: (text: string, provider?: string) => void;
  onDone?: (event: ChatStreamEvent) => void;
  onError?: (message: string) => void;
}

export async function streamAiChat(
  messages: ChatMessage[],
  provider: AiProvider,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  try {
    for await (const event of requestAiStream(messages, provider, signal)) {
      if (event.type === "delta" && event.text) handlers.onDelta?.(event.text, event.provider);
      else if (event.type === "done") handlers.onDone?.(event);
      else if (event.type === "error") handlers.onError?.(event.error ?? "Stream error");
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    handlers.onError?.((error as Error).message);
  }
}

export interface AiChatOnceResult {
  text: string;
  provider?: string;
  fallback: boolean;
}

/** Convenience: accumulate the full streamed reply into one string. */
export async function aiChatOnce(
  messages: ChatMessage[],
  provider: AiProvider = "auto",
): Promise<AiChatOnceResult> {
  let text = "";
  let usedProvider: string | undefined;
  let fallback = false;

  for await (const event of requestAiStream(messages, provider)) {
    if (event.type === "delta" && event.text) {
      text += event.text;
      usedProvider = event.provider ?? usedProvider;
    } else if (event.type === "done") {
      usedProvider = event.provider ?? usedProvider;
      fallback = Boolean(event.fallback);
    } else if (event.type === "error") {
      throw new Error(event.error ?? "Stream error");
    }
  }

  return { text, provider: usedProvider, fallback };
}
