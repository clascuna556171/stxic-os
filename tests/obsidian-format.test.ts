import { describe, it, expect } from "vitest";
import {
  buildNoteFromImport,
  extractTags,
  extractWikilinks,
  importObsidianVault,
  parseFrontmatter,
  serializeFrontmatter,
  toObsidianContent,
} from "@/lib/obsidian/format";
import type { Note } from "@/types";

const baseNote: Note = {
  id: "n_123",
  title: "My Note",
  content: "Hello [[Other]] and #study",
  folder: "Projects",
  tags: ["study", "work"],
  favorite: false,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("serializeFrontmatter", () => {
  it("emits title, stxic_id, tags, and created", () => {
    const md = toObsidianContent(baseNote);
    expect(md).toContain("title: My Note");
    expect(md).toContain("stxic_id: n_123");
    expect(md).toContain('tags: ["study", "work"]');
    expect(md).toContain("created: ");
    expect(md).toContain("Hello [[Other]] and #study");
  });

  it("quotes titles with special characters", () => {
    const md = serializeFrontmatter({ ...baseNote, title: "Note: Draft" });
    expect(md).toContain('title: "Note: Draft"');
  });
});

describe("parseFrontmatter", () => {
  it("round-trips serialize → parse", () => {
    const { frontmatter, content } = parseFrontmatter(toObsidianContent(baseNote));
    expect(frontmatter.title).toBe("My Note");
    expect(frontmatter.stxicId).toBe("n_123");
    expect(frontmatter.tags).toEqual(["study", "work"]);
    expect(content).toBe(baseNote.content);
  });

  it("parses block-list tags", () => {
    const md = "---\ntitle: T\ntags:\n  - a\n  - b\n---\n\nbody";
    const { frontmatter, content } = parseFrontmatter(md);
    expect(frontmatter.tags).toEqual(["a", "b"]);
    expect(content).toBe("body");
  });

  it("returns content unchanged when there is no frontmatter", () => {
    const { frontmatter, content } = parseFrontmatter("# Just markdown");
    expect(frontmatter.tags).toEqual([]);
    expect(content).toBe("# Just markdown");
  });
});

describe("extractWikilinks / extractTags", () => {
  it("extracts and dedupes wikilink targets", () => {
    const text = "See [[Alpha]], [[Beta|alias]] and [[Alpha#Heading]].";
    expect(extractWikilinks(text)).toEqual(["Alpha", "Beta"]);
  });

  it("extracts inline tags", () => {
    const text = "notes about #work and #life/work.";
    expect(extractTags(text)).toEqual(["work", "life/work"]);
  });
});

describe("importObsidianVault", () => {
  function fakeFile(name: string, content: string, relPath = ""): File {
    return { name, webkitRelativePath: relPath, text: async () => content } as unknown as File;
  }

  it("maps .md files to notes with folders from relative paths", async () => {
    const notes = await importObsidianVault([
      fakeFile("a.md", "---\ntitle: Alpha\ntags: [x]\n---\n\nbody", "Vault/a.md"),
      fakeFile("b.md", "---\ntitle: Beta\n---\n\nbody", "Vault/Sub/b.md"),
      fakeFile("skip.txt", "nope", "Vault/skip.txt"),
    ]);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ title: "Alpha", folder: "", tags: ["x"] });
    expect(notes[1]).toMatchObject({ title: "Beta", folder: "Sub" });
  });

  it("derives a title from the filename when frontmatter is absent", async () => {
    const notes = await importObsidianVault([fakeFile("hello-world.md", "body")]);
    expect(notes[0]!.title).toBe("hello world");
  });
});

describe("buildNoteFromImport", () => {
  it("reuses an existing note by id", () => {
    const existing: Note = { ...baseNote, title: "Old", favorite: true };
    const note = buildNoteFromImport(
      { title: "New", content: "x", tags: [], folder: "" },
      existing,
    );
    expect(note.id).toBe(existing.id);
    expect(note.favorite).toBe(true);
    expect(note.title).toBe("New");
  });
});
