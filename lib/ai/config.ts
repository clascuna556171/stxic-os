/**
 * Stxic AI config — provider availability + resolution. Pure and unit-tested.
 * Reads `GROQ_*` / `OLLAMA_*` env vars lazily (never at module load) so tests
 * can stub them. Keys are server-side only: the client talks to `/api/ai/chat`,
 * and Next only inlines `NEXT_PUBLIC_*` into client bundles.
 */

import type { AiProvider, ConcreteProvider } from "./types";

export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const GROQ_VISION_DEFAULT_MODEL = "llama-3.2-11b-vision-preview";
export const OLLAMA_DEFAULT_MODEL = "qwen2.5-coder:1.5b";

export function groqConfig() {
  return {
    apiKey: process.env.GROQ_API_KEY ?? "",
    model: process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL,
  };
}

export function groqVisionConfig() {
  return {
    apiKey: process.env.GROQ_API_KEY ?? "",
    model: process.env.GROQ_VISION_MODEL ?? GROQ_VISION_DEFAULT_MODEL,
  };
}

export function ollamaConfig() {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/+$/, ""),
    model: process.env.OLLAMA_MODEL ?? OLLAMA_DEFAULT_MODEL,
  };
}

export function groqAvailable(): boolean {
  return groqConfig().apiKey.length > 0;
}

export function ollamaAvailable(): boolean {
  return ollamaConfig().baseUrl.length > 0;
}

export interface ProviderPlan {
  primary: ConcreteProvider;
  secondary: ConcreteProvider | null;
}

/**
 * Resolve which provider(s) to try.
 * - `ollama` / `groq`: strict — no cross-provider fallback.
 * - `auto`: Ollama first, then Groq if a key is configured.
 */
export function resolveProvider(pref: AiProvider): ProviderPlan {
  if (pref === "groq") return { primary: "groq", secondary: null };
  if (pref === "ollama") return { primary: "ollama", secondary: null };

  const primary: ConcreteProvider = ollamaAvailable() ? "ollama" : "groq";
  const secondary: ConcreteProvider | null =
    primary === "ollama" ? (groqAvailable() ? "groq" : null) : ollamaAvailable() ? "ollama" : null;
  return { primary, secondary };
}

export const CANNED_FALLBACK =
  "I can't reach a model right now (no Ollama or Groq available). Check your connection, or add a Groq API key and try again.";
