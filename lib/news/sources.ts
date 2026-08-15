/**
 * Curated RSS/Atom sources for the news hub. Public, key-free feeds only.
 * Nitter instances are excluded (mostly dead by 2026); replaced with stable
 * first-party blogs/feeds. Anthropic and DeepSeek are intentionally absent —
 * neither publishes an official RSS/Atom feed. See docs/AGENT_NEWS_X.md.
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

  // ── Primary-source labs & outlets (official RSS/Atom) ────────
  {
    id: "openai",
    name: "OpenAI Blog",
    url: "https://openai.com/news/rss.xml",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "deepmind",
    name: "Google DeepMind",
    url: "https://deepmind.google/blog/rss.xml",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "huggingface",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "mit-tech-review",
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/feed/",
    category: "Tech",
    defaultOn: true,
  },

  // ── Reddit communities (native .rss Atom; .json is OAuth-gated) ──
  // Rate-limited (429) under bursts — see fetchers.ts concurrency handling.
  {
    id: "reddit-ml",
    name: "r/MachineLearning",
    url: "https://www.reddit.com/r/MachineLearning/.rss",
    category: "Research",
    defaultOn: true,
  },
  {
    id: "reddit-localllama",
    name: "r/LocalLLaMA",
    url: "https://www.reddit.com/r/LocalLLaMA/.rss",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "reddit-artificial",
    name: "r/artificial",
    url: "https://www.reddit.com/r/artificial/.rss",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "reddit-openai",
    name: "r/OpenAI",
    url: "https://www.reddit.com/r/OpenAI/.rss",
    category: "AI",
    defaultOn: true,
  },
  {
    id: "reddit-programming",
    name: "r/programming",
    url: "https://www.reddit.com/r/programming/.rss",
    category: "Dev",
    defaultOn: true,
  },
  {
    id: "reddit-technology",
    name: "r/technology",
    url: "https://www.reddit.com/r/technology/.rss",
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
