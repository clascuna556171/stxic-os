import { describe, expect, it } from "vitest";
import { buildOcrMessages, MAX_IMAGE_CHARS } from "@/lib/ai/ocr";
import { ocrExtractPrompt } from "@/lib/ai/prompts";
import { GROQ_VISION_DEFAULT_MODEL, groqVisionConfig } from "@/lib/ai/config";

describe("ocrExtractPrompt", () => {
  it("instructs verbatim, structure-preserving extraction", () => {
    const prompt = ocrExtractPrompt();
    expect(prompt).toContain("Extract ALL text");
    expect(prompt).toContain("NO_TEXT");
    expect(prompt).toContain("plain text only");
  });
});

describe("buildOcrMessages", () => {
  it("shapes the Groq vision payload", () => {
    const messages = buildOcrMessages("data:image/jpeg;base64,abc", "prompt");
    expect(messages).toHaveLength(1);
    const content = messages[0]!.content as Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }>;
    expect(content[0]).toMatchObject({ type: "text", text: "prompt" });
    expect(content[1]).toMatchObject({
      type: "image_url",
      image_url: { url: "data:image/jpeg;base64,abc" },
    });
  });
});

describe("groqVisionConfig", () => {
  it("defaults to the multimodal qwen vision model", () => {
    expect(GROQ_VISION_DEFAULT_MODEL).toBe("qwen/qwen3.6-27b");
    expect(groqVisionConfig().model).toBe(GROQ_VISION_DEFAULT_MODEL);
  });
});

describe("MAX_IMAGE_CHARS", () => {
  it("guards against oversized base64 payloads", () => {
    expect(MAX_IMAGE_CHARS).toBeGreaterThanOrEqual(20_000_000);
  });
});
