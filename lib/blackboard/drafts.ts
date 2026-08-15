/**
 * BADS-DE draft helpers — build the AI draft messages and convert the result
 * into a Note. Pure, unit-tested. See docs/AGENT_BADS_DE.md.
 */

import { badsDraftPrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/lib/ai/types";
import type { BlackboardEvent, Note } from "@/types";

export const ASSIGNMENTS_FOLDER = "Assignments";

/** System + user messages for an assignment skeleton draft. */
export function draftMessages(event: BlackboardEvent): ChatMessage[] {
  return [
    {
      role: "system",
      content: badsDraftPrompt({ title: event.summary, description: event.description ?? "" }),
    },
    { role: "user", content: `Draft a skeleton for "${event.summary}".` },
  ];
}

/** Turn a generated draft into a Note in the "Assignments" folder. */
export function eventToNote(event: BlackboardEvent, text: string, now = Date.now()): Note {
  return {
    id: crypto.randomUUID(),
    title: event.summary,
    content: text,
    folder: ASSIGNMENTS_FOLDER,
    tags: ["assignment"],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
