/**
 * Stxic AI router — single interface over Groq + Ollama.
 *
 * `chat()` returns a complete `ChatResult`; `streamChat()` yields SSE-style
 * events. Both apply the provider plan from `resolveProvider` and fall back
 * to a canned message on total failure so the UI never crashes. See
 * docs/AGENT_AI.md.
 */

import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  ChatStreamEvent,
  ConcreteProvider,
} from "./types";
import { CANNED_FALLBACK, resolveProvider } from "./config";
import { chatGroq, streamGroq } from "./groq";
import { chatOllama, streamOllama } from "./ollama";

const DEFAULT_TIMEOUT_MS = 30_000;

function timeoutSignal(external?: AbortSignal): AbortSignal {
  if (external && typeof AbortSignal.any === "function") {
    return AbortSignal.any([AbortSignal.timeout(DEFAULT_TIMEOUT_MS), external]);
  }
  return AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
}

function withSystem(messages: ChatMessage[], opts: ChatOptions): ChatMessage[] {
  return opts.system ? [{ role: "system", content: opts.system }, ...messages] : messages;
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const plan = resolveProvider(opts.provider ?? "auto");
  const providers = [plan.primary, plan.secondary].filter((p): p is ConcreteProvider => p != null);

  const msgs = withSystem(messages, opts);
  for (const provider of providers) {
    try {
      const signal = timeoutSignal(opts.signal);
      const common = { temperature: opts.temperature, signal };
      const text =
        provider === "groq" ? await chatGroq(msgs, common) : await chatOllama(msgs, common);
      return { text, provider, fallback: false };
    } catch {
      // try the next provider
    }
  }

  return { text: CANNED_FALLBACK, provider: plan.primary, fallback: true };
}

export async function* streamChat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): AsyncGenerator<ChatStreamEvent> {
  const plan = resolveProvider(opts.provider ?? "auto");
  const providers = [plan.primary, plan.secondary].filter((p): p is ConcreteProvider => p != null);

  const msgs = withSystem(messages, opts);
  let sawDelta = false;
  let lastProvider: ConcreteProvider = plan.primary;

  for (const provider of providers) {
    lastProvider = provider;
    try {
      const signal = timeoutSignal(opts.signal);
      const common = { temperature: opts.temperature, signal };
      const stream = provider === "groq" ? streamGroq(msgs, common) : streamOllama(msgs, common);
      for await (const text of stream) {
        sawDelta = true;
        yield { type: "delta", text, provider };
      }
      if (!sawDelta) throw new Error(`${provider} returned no content`);
      yield { type: "done", provider };
      return;
    } catch (error) {
      if (sawDelta) {
        yield { type: "error", error: (error as Error).message, provider };
        return;
      }
      // fall through to the next provider
    }
  }

  yield { type: "delta", text: CANNED_FALLBACK, provider: lastProvider, fallback: true };
  yield { type: "done", provider: lastProvider, fallback: true };
}
