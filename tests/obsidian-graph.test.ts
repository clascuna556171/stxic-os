import { describe, expect, it } from "vitest";
import { buildGraph, layoutGraph, type GraphInputNote } from "@/lib/obsidian/graph";

const notes: GraphInputNote[] = [
  { id: "a.md", title: "Alpha", content: "see [[Beta]]", tags: ["x"] },
  { id: "b.md", title: "Beta", content: "see [[Alpha]] and [[Gamma]]", tags: [] },
  { id: "c.md", title: "Gamma", content: "nothing", tags: [] },
];

describe("buildGraph", () => {
  it("resolves wikilinks into edges (deduped, no self-loops)", () => {
    const g = buildGraph(notes);
    expect(g.links).toHaveLength(2);
    expect(g.links.some((l) => l.source === "a.md" && l.target === "b.md")).toBe(true);
    expect(g.links.some((l) => l.source === "b.md" && l.target === "c.md")).toBe(true);
  });

  it("drops unresolved links", () => {
    const g = buildGraph([{ id: "a.md", title: "A", content: "[[Missing]]", tags: [] }]);
    expect(g.links).toHaveLength(0);
  });
});

describe("layoutGraph", () => {
  it("produces finite positions for every node", () => {
    const g = buildGraph(notes);
    const positioned = layoutGraph(g);
    expect(positioned).toHaveLength(3);
    for (const n of positioned) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it("returns empty for no nodes", () => {
    expect(layoutGraph({ nodes: [], links: [] })).toEqual([]);
  });
});
