/**
 * Groq provider (OpenAI-compatible chat completions). Server-side only.
 */

import type { ChatMessage } from "./types";
import { groqConfig } from "./config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ProviderCallOpts {
  temperature?: number;
  signal?: AbortSignal;
}

async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
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
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

export async function chatGroq(
  messages: ChatMessage[],
  opts: ProviderCallOpts = {},
): Promise<string> {
  const { apiKey, model } = groqConfig();
  if (!apiKey) throw new Error("Groq API key not configured");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

export async function* streamGroq(
  messages: ChatMessage[],
  opts: ProviderCallOpts = {},
): AsyncGenerator<string> {
  const { apiKey, model } = groqConfig();
  if (!apiKey) throw new Error("Groq API key not configured");
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: opts.temperature ?? 0.7,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("Groq stream empty");
  yield* readSse(res.body);
}
