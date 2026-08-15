/**
 * Obsidian format compatibility (PORTABLE layer) — pure, side-effect free.
 *
 * Serialize Stxic notes to/from Obsidian-compatible `.md`: YAML frontmatter
 * (`title`, `stxic_id`, `tags`, `created`), `[[wikilinks]]`, `#tags`, and
 * `/`-separated folder paths. No network, no embedding — this is the format
 * layer; the live desktop bridge lives in `client.ts` / `sync.ts`.
 *
 * See docs/AGENT_EXTRAS.md (section B).
 */

import type { Note } from "@/types";

export interface ObsidianFrontmatter {
  title?: string;
  tags: string[];
  created?: number;
  stxicId?: string;
}

export interface ParsedNote {
  title: string;
  content: string;
  tags: string[];
  folder: string;
  stxicId?: string;
  createdAt?: number;
}

const WIKILINK_RE = /\[\[([^\]|#]+?)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
const TAG_RE = /(^|[\s(])#([A-Za-z0-9_/-]+)/g;

function stripQuotes(value: string): string {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function parseInlineList(value: string): string[] {
  const t = value.trim();
  if (!(t.startsWith("[") && t.endsWith("]"))) return [];
  const inner = t.slice(1, -1);
  if (!inner.trim()) return [];
  return inner
    .split(",")
    .map((x) => stripQuotes(x.trim()))
    .filter(Boolean);
}

/** Split leading `---` frontmatter from a markdown document. */
export function parseFrontmatter(md: string): {
  frontmatter: ObsidianFrontmatter;
  content: string;
} {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(md);
  if (!match) return { frontmatter: { tags: [] }, content: md };

  const body = match[1]!;
  // Strip the single blank-line separator that conventionally follows `---`.
  const content = md.slice(match[0].length).replace(/^\r?\n/, "");
  const frontmatter: ObsidianFrontmatter = { tags: [] };
  const lines = body.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const kv = /^([A-Za-z_][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1]!;
    const value = kv[2] ?? "";

    if (key === "tags") {
      if (value.trim() === "") {
        const items: string[] = [];
        while (i + 1 < lines.length && /^[ \t]+-\s+/.test(lines[i + 1]!)) {
          items.push(lines[i + 1]!.replace(/^[ \t]+-\s+/, "").trim());
          i++;
        }
        frontmatter.tags = items.map(stripQuotes).filter(Boolean);
      } else {
        const inline = parseInlineList(value);
        frontmatter.tags = inline.length ? inline : [stripQuotes(value)].filter(Boolean);
      }
    } else if (key === "title") {
      frontmatter.title = stripQuotes(value) || undefined;
    } else if (key === "stxic_id") {
      frontmatter.stxicId = stripQuotes(value) || undefined;
    } else if (key === "created") {
      const t = stripQuotes(value);
      const numeric = Number(t);
      const created = Number.isFinite(numeric) && t !== "" ? numeric : Date.parse(t);
      if (!Number.isNaN(created)) frontmatter.created = created;
    }
    i++;
  }

  return { frontmatter, content };
}

/** YAML-safe scalar — quote when it contains control/special characters. */
function yamlScalar(value: string): string {
  if (!value) return '""';
  if (/[:#\[\]{}"'\n\r]/.test(value) || value.trim() !== value) {
    return JSON.stringify(value);
  }
  return value;
}

export function serializeFrontmatter(note: Note): string {
  const lines: string[] = [
    `title: ${yamlScalar(note.title || "Untitled")}`,
    `stxic_id: ${note.id}`,
  ];
  if (note.tags.length) {
    lines.push(`tags: [${note.tags.map((t) => JSON.stringify(t)).join(", ")}]`);
  }
  lines.push(`created: ${new Date(note.createdAt || Date.now()).toISOString()}`);
  return `---\n${lines.join("\n")}\n---`;
}

/** Full Obsidian-compatible document for a note. */
export function toObsidianContent(note: Note): string {
  return `${serializeFrontmatter(note)}\n\n${note.content}`;
}

/** Unique `[[Title]]` targets referenced from a document. */
export function extractWikilinks(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(WIKILINK_RE)) {
    const target = m[1]!.trim();
    if (target) out.add(target);
  }
  return [...out];
}

/** Unique `#tag` tokens found inline in a document. */
export function extractTags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) out.add(m[2]!);
  return [...out];
}

function titleFromName(name: string): string {
  return name.replace(/\.md$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled";
}

function folderFromPath(file: File): string {
  const rel = file.webkitRelativePath || file.name;
  const parts = rel.split("/");
  if (file.webkitRelativePath && parts.length > 2) {
    return parts.slice(1, -1).join("/");
  }
  return "";
}

/** Parse a folder/multi-file pick of Obsidian `.md` files into Stxic-shaped notes. */
export async function importObsidianVault(files: File[]): Promise<ParsedNote[]> {
  const notes: ParsedNote[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".md")) continue;
    const text = await file.text();
    const { frontmatter, content } = parseFrontmatter(text);
    notes.push({
      title: frontmatter.title ?? titleFromName(file.name),
      content,
      tags: frontmatter.tags,
      folder: folderFromPath(file),
      stxicId: frontmatter.stxicId,
      createdAt: frontmatter.created,
    });
  }
  return notes;
}

/** Build a full `Note` from a parsed import, reusing an existing note by id. */
export function buildNoteFromImport(parsed: ParsedNote, existing?: Note): Note {
  const now = Date.now();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    title: parsed.title,
    content: parsed.content,
    folder: parsed.folder,
    tags: parsed.tags,
    favorite: existing?.favorite ?? false,
    createdAt: parsed.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };
}
