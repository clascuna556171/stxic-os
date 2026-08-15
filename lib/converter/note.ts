/**
 * Converted text → Note. Pure, mirrors lib/news/note.ts.
 */

import type { Note } from "@/types";
import type { ConverterFormat } from "./formats";
import { formatLabel } from "./formats";

export const CONVERTED_FOLDER = "Converted";

export function textToNote(
  name: string,
  text: string,
  format: ConverterFormat,
  now = Date.now(),
): Note {
  const title = name.replace(/\.[^.]+$/, "") || "Converted file";
  return {
    id: crypto.randomUUID(),
    title,
    content: text,
    folder: CONVERTED_FOLDER,
    tags: ["converted", formatLabel(format).toLowerCase()],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
