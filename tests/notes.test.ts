import { describe, it, expect } from "vitest";
import { NOTE_TEMPLATES, newNoteFromTemplate, noteFolders, slugify } from "@/lib/notes";
import type { Note } from "@/types";

describe("note templates", () => {
  it("has a blank template first", () => {
    expect(NOTE_TEMPLATES[0]?.id).toBe("empty");
    expect(NOTE_TEMPLATES[0]?.content).toBe("");
  });

  it("creates a fresh note with an id and timestamps", () => {
    const n = newNoteFromTemplate(NOTE_TEMPLATES[0]!);
    expect(n.id).toBeTruthy();
    expect(n.title).toBe("");
    expect(n.createdAt).toBe(n.updatedAt);
    expect(n.favorite).toBe(false);
  });

  it("uses the template folder", () => {
    const meeting = NOTE_TEMPLATES.find((t) => t.id === "meeting")!;
    expect(newNoteFromTemplate(meeting).folder).toBe("Meetings");
  });
});

describe("slugify", () => {
  it("slugs a title for export filenames", () => {
    expect(slugify("My Notes")).toBe("my-notes");
    expect(slugify("  Hello, World!  ")).toBe("hello-world");
    expect(slugify("")).toBe("note");
    expect(slugify("---")).toBe("note");
  });
});

describe("noteFolders", () => {
  it("returns distinct sorted folders", () => {
    const notes: Note[] = [
      {
        id: "a",
        title: "a",
        content: "",
        folder: "Work",
        tags: [],
        favorite: false,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "b",
        title: "b",
        content: "",
        folder: "Personal",
        tags: [],
        favorite: false,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "c",
        title: "c",
        content: "",
        folder: "Work",
        tags: [],
        favorite: false,
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    expect(noteFolders(notes)).toEqual(["Personal", "Work"]);
  });
});
