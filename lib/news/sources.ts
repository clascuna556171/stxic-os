/**
 * Curated RSS/Atom sources for the news hub. Public, key-free feeds only.
 * Nitter instances are excluded (mostly dead by 2026); replaced with stable
 * first-party blogs/feeds. See docs/AGENT_NEWS_X.md.
 */

import type { NewsSource } from "./types";

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "techcrunch-ai",
    name: "TechCrunch AI",
    url: "https://techcrunch.com/category/artificial-intelligence/feed/",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "verge-ai",
    name: "The Verge AI",
    url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    category: "Tech",
    defaultOn: true,
  },
  {
    id: "simonwillison",
    name: "Simon Willison",
    url: "https://simonwillison.net/atom/everything/",
    category: "Dev",
    defaultOn: true,
  },
  {
    id: "hn",
    name: "Hacker News",
    url: "https://hnrss.org/frontpage",
    category: "Tech",
    defaultOn: true,
  },
];

export const DEFAULT_SOURCE_IDS: string[] = NEWS_SOURCES.filter((s) => s.defaultOn).map(
  (s) => s.id,
);

export function sourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find((s) => s.id === id);
}
