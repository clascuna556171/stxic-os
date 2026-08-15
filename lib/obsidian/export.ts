/**
 * Client-side Obsidian `.md` downloads (browser only).
 */

import type { Note } from "@/types";
import { slugify } from "@/lib/notes";
import { toObsidianContent } from "./format";

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadObsidianNote(note: Note) {
  downloadText(`${slugify(note.title)}.md`, toObsidianContent(note));
}

/** Bulk export — staggered to avoid the browser blocking multiple downloads. */
export function downloadObsidianNotes(notes: Note[]) {
  notes.forEach((n, i) => {
    setTimeout(() => downloadObsidianNote(n), i * 120);
  });
}
