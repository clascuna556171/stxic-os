/**
 * Obsidian push/pull mapping (pure, side-effect free).
 *
 * Push: a Stxic note → `Stxic/{folder}/{slug}.md` with frontmatter
 * (`stxic_id` is the source of truth for pull-back matching).
 * Pull: a vault note → parse frontmatter → match a local note by `stxic_id`
 * (create-if-missing), producing a plan the UI can confirm before applying.
 *
 * This module is import-safe in tests (no Firestore / fetch). The actual
 * reads/writes go through the REST client and `lib/hydrate` in the UI layer.
 */

import { slugify } from "@/lib/notes";
import { parseFrontmatter, toObsidianContent } from "./format";
import type { NoteJson } from "./client";
import type { Note } from "@/types";

/** Vault path for a note push: `Stxic/{folder}/{slug}.md`. */
export function buildPushPath(note: Note): string {
  const folder = note.folder.trim().replace(/\/+$/, "");
  const slug = slugify(note.title);
  return `Stxic/${folder ? `${folder}/` : ""}${slug}.md`;
}

/** Full vault document for a note push (frontmatter + body). */
export function pushContent(note: Note): string {
  return toObsidianContent(note);
}

function titleFromVaultPath(path: string): string {
  const name = path.split("/").pop() ?? "";
  return name.replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled";
}

/** Folder under `Stxic/` for a vault path (empty when at the root). */
export function folderFromVaultPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "Stxic") parts.shift();
  parts.pop(); // drop the filename
  return parts.join("/");
}

/** First non-empty line of a document, for the change-confirmation preview. */
export function firstLine(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0);
  return (line ?? "").trim();
}

export type PullKind = "new" | "update" | "unchanged";

export interface PullPlan {
  path: string;
  kind: PullKind;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  stxicId?: string;
  existingId?: string;
  localFirstLine?: string;
  vaultFirstLine?: string;
}

/** Decide what pulling `path` would do against the current local notes. */
export function planPull(path: string, vault: NoteJson, notes: Note[]): PullPlan {
  const { frontmatter, content } = parseFrontmatter(vault.content);
  const title = frontmatter.title ?? titleFromVaultPath(path);
  const tags = frontmatter.tags ?? [];
  const folder = folderFromVaultPath(path);
  const stxicId = frontmatter.stxicId;

  const existing = stxicId ? notes.find((n) => n.id === stxicId) : undefined;

  if (!existing) {
    return { path, kind: "new", title, content, tags, folder, stxicId };
  }

  if (existing.content === content) {
    return {
      path,
      kind: "unchanged",
      title,
      content,
      tags,
      folder,
      stxicId,
      existingId: existing.id,
    };
  }

  return {
    path,
    kind: "update",
    title,
    content,
    tags,
    folder,
    stxicId,
    existingId: existing.id,
    localFirstLine: firstLine(existing.content),
    vaultFirstLine: firstLine(content),
  };
}
