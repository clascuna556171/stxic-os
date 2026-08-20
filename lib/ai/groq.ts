/**
 * Groq provider (OpenAI-compatible chat completions). Server-side only.
 */

import type { ChatMessage } from "./types";
import { groqConfig } from "./config";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ProviderCallOpts {
  temperature?: number;
  /** `hidden` (default) returns only the final answer; `raw` keeps think tags. */
  reasoning?: "hidden" | "raw";
  signal?: AbortSignal;
}

const THINK_RE = /<think>[\s\S]*?<\/think>|<think\/>/g;

/** Strip the model's `<think>…</think>` reasoning blocks (final text path). */
export function stripThink(text: string): string {
  return text.replace(THINK_RE, "").trim();
}

/**
 * Strip think blocks WITHOUT trimming. Streaming deltas arrive as fragments
 * (e.g. " world"); trimming each chunk would eat the spaces between words and
 * produce run-together, unreadable text.
 */
export function stripThinkBlocks(text: string): string {
  return text.replace(THINK_RE, "");
}

/** When raw reasoning is requested, keep the think tags the user asked to see. */
function cleanContent(text: string, reasoning: "hidden" | "raw" | undefined): string {
  return reasoning === "raw" ? text : stripThinkBlocks(text);
}

async function* readSse(
  body: ReadableStream<Uint8Array>,
  reasoning: "hidden" | "raw" | undefined,
): AsyncGenerator<string> {
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
          choices?: { delta?: { content?: string; reasoning_content?: string } }[];
        };
        const text = json.choices?.[0]?.delta?.content;
        if (text) {
          const clean = cleanContent(text, reasoning);
          if (clean) yield clean;
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

function groqBody(
  model: string,
  messages: ChatMessage[],
  opts: ProviderCallOpts,
  stream: boolean,
) {
  return {
    model,
    messages,
    stream,
    temperature: opts.temperature ?? 0.7,
    // Qwen 3.6: "hidden" reasons internally but hides the thinking (clean,
    // higher-quality answers); "raw" exposes it in <think> tags on purpose.
    reasoning_format: opts.reasoning ?? "hidden",
  };
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
    body: JSON.stringify(groqBody(model, messages, opts, false)),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return cleanContent(json.choices?.[0]?.message?.content ?? "", opts.reasoning);
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
    body: JSON.stringify(groqBody(model, messages, opts, true)),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.body) throw new Error("Groq stream empty");
  yield* readSse(res.body, opts.reasoning);
}
