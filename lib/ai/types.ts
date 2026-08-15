/**
 * Stxic AI types — shared by the router, providers, and the chat API.
 * See docs/AGENT_AI.md.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** `auto` = Ollama first → Groq fallback (see lib/ai/config.ts). */
export type AiProvider = "auto" | "ollama" | "groq";

export type ConcreteProvider = "ollama" | "groq";

export interface ChatOptions {
  provider?: AiProvider;
  /** 0–1, default 0.7. */
  temperature?: number;
  /** Optional system prompt to prepend. */
  system?: string;
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
  provider: ConcreteProvider;
  /** True when every provider failed and the canned fallback was returned. */
  fallback: boolean;
}

export interface ChatStreamEvent {
  type: "delta" | "done" | "error";
  text?: string;
  provider?: ConcreteProvider;
  fallback?: boolean;
  error?: string;
}
