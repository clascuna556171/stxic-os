/**
 * OCR via Groq vision (server-side). Takes a base64 image data URL of a
 * scanned page and returns extracted, structure-preserving text.
 * See docs/AGENT_EXTRAS.md (section F).
 */

import { groqVisionConfig } from "./config";
import { ocrExtractPrompt } from "./prompts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Guard: reject base64 payloads over ~15 MB. */
export const MAX_IMAGE_CHARS = 20_000_000;

/** Build the vision messages payload (pure — unit-tested). */
export function buildOcrMessages(imageDataUrl: string, prompt: string) {
  return [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];
}

export interface OcrResult {
  text: string;
}

export async function ocrExtract(imageDataUrl: string): Promise<OcrResult> {
  const { apiKey, model } = groqVisionConfig();
  if (!apiKey) throw new Error("Groq API key not configured");
  if (imageDataUrl.length > MAX_IMAGE_CHARS) {
    throw new Error("Image too large for OCR (max ~15 MB).");
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: buildOcrMessages(imageDataUrl, ocrExtractPrompt()),
      temperature: 0.1,
      reasoning_effort: "none",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OCR failed (Groq ${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  return { text: raw === "NO_TEXT" ? "" : raw };
}
