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
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, provider }),
      signal,
    });

    if (!res.ok) {
      handlers.onError?.(`Request failed (${res.status})`);
      return;
    }
    if (!res.body) {
      handlers.onError?.("Empty response");
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
          if (!event) continue;
          if (event.type === "delta" && event.text) {
            handlers.onDelta?.(event.text, event.provider);
          } else if (event.type === "done") {
            handlers.onDone?.(event);
          } else if (event.type === "error") {
            handlers.onError?.(event.error ?? "Stream error");
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    handlers.onError?.((error as Error).message);
  }
}
