/**
 * News → AI helpers. Pure message builders (no network) so they're unit-testable;
 * the client executes them via `/api/ai/chat`. See docs/AGENT_NEWS_X.md.
 */

import { threadSubPrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/lib/ai/types";
import type { NewsItem } from "./types";

/** System + user messages for a TL;DR of a news item. */
export function threadSummaryMessages(item: NewsItem): ChatMessage[] {
  const text = [item.summary ?? "", item.title].filter(Boolean).join("\n\n").slice(0, 6000);
  return [
    { role: "system", content: threadSubPrompt({ title: item.title, text }) },
    { role: "user", content: "Summarize this article." },
  ];
}
