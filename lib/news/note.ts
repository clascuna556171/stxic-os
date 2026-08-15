/**
 * News → Note conversion ("Save to Notes"). Pure, unit-tested.
 */

import type { NewsItem } from "./types";
import type { Note } from "@/types";

export const NEWS_NOTE_FOLDER = "Saved from News";

export function newsItemToNote(item: NewsItem, now = Date.now()): Note {
  const content = [
    `# ${item.title}`,
    "",
    item.url,
    "",
    item.summary ?? "",
    "",
    item.author ? `By ${item.author}` : "",
    `Source: ${item.sourceName}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: crypto.randomUUID(),
    title: item.title,
    content,
    folder: NEWS_NOTE_FOLDER,
    tags: ["news"],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
