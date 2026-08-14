/**
 * Notes helpers — built-in templates, slug export, note factories.
 * Pure and side-effect free (unit-testable).
 */

import type { Note } from "@/types";

export interface NoteTemplate {
  id: string;
  label: string;
  folder: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  { id: "empty", label: "Blank note", folder: "", content: "" },
  {
    id: "meeting",
    label: "Meeting notes",
    folder: "Meetings",
    content:
      "# Meeting notes\n\n**Date:** \n**Attendees:** \n\n## Agenda\n\n- \n\n## Notes\n\n## Action items\n\n- [ ] \n",
  },
  {
    id: "daily",
    label: "Daily log",
    folder: "Journal",
    content:
      "# Daily log\n\n**Date:** \n\n## Wins\n\n- \n\n## In progress\n\n- \n\n## Tomorrow\n\n- \n",
  },
  {
    id: "project",
    label: "Project brief",
    folder: "Projects",
    content:
      "# Project brief\n\n**Goal:** \n\n## Overview\n\n## Deliverables\n\n- [ ] \n\n## Notes\n\n",
  },
];

/** URL-safe filename stem from a title. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "note";
}

/** Build a fresh note from a template (id + timestamps assigned). */
export function newNoteFromTemplate(template: NoteTemplate, folder = template.folder): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "",
    content: template.content,
    folder,
    tags: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Distinct folders from notes, sorted (unfiled = ""). */
export function noteFolders(notes: Note[]): string[] {
  const folders = new Set<string>();
  for (const n of notes) folders.add(n.folder);
  return [...folders].sort((a, b) => a.localeCompare(b));
}
