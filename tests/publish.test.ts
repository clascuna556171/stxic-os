import { describe, it, expect } from "vitest";
import { sanitizeSlug } from "@/lib/publish/shared";

describe("sanitizeSlug", () => {
  it("lowercases and dashes a title", () => {
    expect(sanitizeSlug("My Cool Note")).toBe("my-cool-note");
    expect(sanitizeSlug("  Hello, World!  ")).toBe("hello-world");
  });

  it("strips punctuation and collapses runs", () => {
    expect(sanitizeSlug("a---b   c")).toBe("a-b-c");
    expect(sanitizeSlug("(v1) Final Report")).toBe("v1-final-report");
  });

  it("returns empty for unusable input", () => {
    expect(sanitizeSlug("")).toBe("");
    expect(sanitizeSlug("!!!")).toBe("");
    expect(sanitizeSlug("日本語")).toBe("");
  });

  it("keeps existing slugs stable", () => {
    expect(sanitizeSlug("my-public-note")).toBe("my-public-note");
    expect(sanitizeSlug("NOTE-42")).toBe("note-42");
  });
});
