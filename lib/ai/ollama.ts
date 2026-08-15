/**
 * Ollama provider (local `POST /api/chat`, NDJSON streaming). Server-side only.
 */

import type { ChatMessage } from "./types";
import { ollamaConfig } from "./config";

export interface ProviderCallOpts {
  temperature?: number;
  signal?: AbortSignal;
}

export async function chatOllama(
  messages: ChatMessage[],
  opts: ProviderCallOpts = {},
): Promise<string> {
  const { baseUrl, model } = ollamaConfig();
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: opts.temperature ?? 0.7 },
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { message?: { content?: string } };
  return json.message?.content ?? "";
}

export async function* streamOllama(
  messages: ChatMessage[],
  opts: ProviderCallOpts = {},
): AsyncGenerator<string> {
  const { baseUrl, model } = ollamaConfig();
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature: opts.temperature ?? 0.7 },
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("Ollama stream empty");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean };
        const text = json.message?.content;
        if (text) yield text;
        if (json.done) return;
      } catch {
        // ignore malformed NDJSON lines
      }
    }
  }
}
