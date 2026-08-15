/**
 * BADS-DE sync orchestration — CLIENT-side. Task/note writes are encrypted
 * with the in-memory session DEK, so the browser does the mirroring; the
 * `/api/badsde/sync` route only fetches + parses the iCal feed (bypassing
 * CORS). Idempotent: uids already in `blackboard.mirrored` are skipped.
 * See docs/AGENT_BADS_DE.md.
 */

import { aiChatOnce } from "@/lib/ai/client";
import { getBlackboard, saveBlackboard, saveNote, saveTask } from "@/lib/hydrate";
import { startOfDay } from "@/lib/utils/dates";
import { draftMessages, eventToNote } from "./drafts";
import type { BlackboardEvent, TaskItem } from "@/types";

export interface SyncResult {
  added: number;
  total: number;
  events: BlackboardEvent[];
  lastSync: number;
}

export async function syncBlackboard(icalUrl: string): Promise<SyncResult> {
  const res = await fetch("/api/badsde/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ icalUrl }),
  });
  const json = (await res.json()) as { ok?: boolean; events?: unknown; error?: string };
  if (!json.ok || !Array.isArray(json.events)) {
    throw new Error(json.error ?? `Sync failed (${res.status})`);
  }

  const now = Date.now();
  const today = startOfDay(now);
  const future = (json.events as BlackboardEvent[])
    .filter((e) => e.dtstart >= today)
    .sort((a, b) => a.dtstart - b.dtstart);

  const bb = await getBlackboard();
  if (!bb.ok) throw new Error(bb.error);
  const mirrored = new Set(bb.data.mirrored);
  const fresh = future.filter((e) => !mirrored.has(e.uid));

  const mirroredNow: string[] = [];
  for (const ev of fresh) {
    const task: TaskItem = {
      id: crypto.randomUUID(),
      title: ev.summary,
      status: "todo",
      priority: "P1",
      dueDate: ev.dtstart,
      type: "assignment",
      createdAt: now,
      updatedAt: now,
    };
    const saved = await saveTask(task);
    if (!saved.ok) continue;
    mirroredNow.push(ev.uid);

    try {
      const draft = await aiChatOnce(draftMessages(ev), "auto");
      await saveNote(eventToNote(ev, draft.text));
    } catch {
      // draft generation is best-effort; the assignment is already mirrored
    }
  }

  await saveBlackboard({
    events: future,
    mirrored: [...mirrored, ...mirroredNow],
    lastSync: now,
  });

  return { added: mirroredNow.length, total: future.length, events: future, lastSync: now };
}
