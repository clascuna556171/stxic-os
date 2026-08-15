import { describe, expect, it } from "vitest";
import { detectFormat } from "@/lib/converter/formats";
import { convertFile, MAX_FILE_BYTES, validateSize } from "@/lib/converter/convert";
import { textToNote, CONVERTED_FOLDER } from "@/lib/converter/note";

describe("detectFormat", () => {
  it("matches by MIME type", () => {
    expect(detectFormat({ name: "x", type: "application/pdf" })).toBe("pdf");
    expect(
      detectFormat({
        name: "x",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBe("docx");
    expect(
      detectFormat({
        name: "x",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBe("xlsx");
    expect(detectFormat({ name: "x", type: "text/csv" })).toBe("csv");
    expect(detectFormat({ name: "x", type: "text/plain" })).toBe("txt");
    expect(detectFormat({ name: "x", type: "text/markdown" })).toBe("md");
    expect(detectFormat({ name: "x", type: "text/html" })).toBe("html");
  });

  it("falls back to extension when MIME is generic", () => {
    expect(detectFormat({ name: "report.pdf", type: "" })).toBe("pdf");
    expect(detectFormat({ name: "notes.md", type: "" })).toBe("md");
    expect(detectFormat({ name: "sheet.xlsx", type: "application/octet-stream" })).toBe("xlsx");
  });

  it("returns null for unknown types", () => {
    expect(detectFormat({ name: "movie.mp4", type: "video/mp4" })).toBeNull();
  });
});

describe("validateSize", () => {
  it("rejects files over the cap", () => {
    expect(validateSize({ size: MAX_FILE_BYTES + 1 })).toBeTruthy();
    expect(validateSize({ size: MAX_FILE_BYTES })).toBeNull();
  });
});

describe("convertFile", () => {
  it("extracts plain text", async () => {
    const file = new File(["hello world"], "a.txt", { type: "text/plain" });
    const res = await convertFile(file);
    expect(res.format).toBe("txt");
    expect(res.text).toBe("hello world");
    expect(res.empty).toBe(false);
  });

  it("extracts markdown", async () => {
    const file = new File(["# Hi"], "a.md", { type: "text/markdown" });
    expect((await convertFile(file)).text).toBe("# Hi");
  });

  it("converts CSV to tab-separated text", async () => {
    const file = new File(["name,age\nAda,36"], "a.csv", { type: "text/csv" });
    const res = await convertFile(file);
    expect(res.format).toBe("csv");
    expect(res.text).toBe("name\tage\nAda\t36");
  });

  it("throws on unsupported types", async () => {
    const file = new File(["x"], "movie.mp4", { type: "video/mp4" });
    await expect(convertFile(file)).rejects.toThrow("Unsupported");
  });

  it("throws on oversized files", async () => {
    const file = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: MAX_FILE_BYTES + 1 });
    await expect(convertFile(file)).rejects.toThrow("too large");
  });
});

describe("textToNote", () => {
  it("builds a note in the Converted folder", () => {
    const note = textToNote("lab.pdf", "text", "pdf", 123);
    expect(note.title).toBe("lab");
    expect(note.content).toBe("text");
    expect(note.folder).toBe(CONVERTED_FOLDER);
    expect(note.tags).toContain("converted");
    expect(note.tags).toContain("pdf");
    expect(note.createdAt).toBe(123);
  });
});
