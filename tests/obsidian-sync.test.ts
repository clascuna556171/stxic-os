import { describe, expect, it } from "vitest";
import {
  buildPushPath,
  firstLine,
  folderFromVaultPath,
  planPull,
  pushContent,
} from "@/lib/obsidian/sync";
import type { NoteJson } from "@/lib/obsidian/client";
import type { Note } from "@/types";

const note: Note = {
  id: "n1",
  title: "My Note",
  content: "Body here",
  folder: "Projects",
  tags: ["work"],
  favorite: false,
  createdAt: 1,
  updatedAt: 2,
};

function vault(content: string, stxicId?: string, title?: string): NoteJson {
  const fm: string[] = [];
  if (title) fm.push(`title: ${title}`);
  if (stxicId) fm.push(`stxic_id: ${stxicId}`);
  const head = fm.length ? `---\n${fm.join("\n")}\n---\n\n` : "";
  return {
    tags: [],
    frontmatter: {},
    stat: { ctime: 1, mtime: 2, size: 3 },
    path: "Stxic/Projects/My Note.md",
    content: `${head}${content}`,
  };
}

describe("buildPushPath", () => {
  it("nests under Stxic with folder and slug", () => {
    expect(buildPushPath(note)).toBe("Stxic/Projects/my-note.md");
  });

  it("omits the folder segment when unfiled", () => {
    expect(buildPushPath({ ...note, folder: "" })).toBe("Stxic/my-note.md");
  });
});

describe("pushContent", () => {
  it("prepends frontmatter with stxic_id", () => {
    const md = pushContent(note);
    expect(md).toContain("stxic_id: n1");
    expect(md).toContain("Body here");
  });
});

describe("folderFromVaultPath", () => {
  it("strips the Stxic prefix and filename", () => {
    expect(folderFromVaultPath("Stxic/Projects/My Note.md")).toBe("Projects");
    expect(folderFromVaultPath("Stxic/My Note.md")).toBe("");
  });
});

describe("firstLine", () => {
  it("returns the first non-empty line", () => {
    expect(firstLine("\n\nHello world\nMore")).toBe("Hello world");
  });
});

describe("planPull", () => {
  it("plans a new note when stxic_id is missing locally", () => {
    const plan = planPull("Stxic/A.md", vault("hello"), []);
    expect(plan.kind).toBe("new");
    expect(plan.title).toBe("A");
  });

  it("plans unchanged when contents match", () => {
    const local: Note = { ...note, id: "n1", content: "hello" };
    const plan = planPull("Stxic/A.md", vault("hello", "n1", "T"), [local]);
    expect(plan.kind).toBe("unchanged");
  });

  it("plans an update with conflict preview when contents differ", () => {
    const local: Note = { ...note, id: "n1", content: "old body" };
    const plan = planPull("Stxic/A.md", vault("new body", "n1", "T"), [local]);
    expect(plan.kind).toBe("update");
    expect(plan.existingId).toBe("n1");
    expect(plan.localFirstLine).toBe("old body");
    expect(plan.vaultFirstLine).toBe("new body");
  });

  it("ignores non-Stxic ids (import as new)", () => {
    const plan = planPull("Stxic/A.md", vault("hello", "other-vault-id", "T"), []);
    expect(plan.kind).toBe("new");
  });
});
