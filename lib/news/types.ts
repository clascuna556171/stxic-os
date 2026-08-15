/**
 * Stxic news hub types. See docs/AGENT_NEWS_X.md.
 */

export type NewsCategory = "AI" | "Tech" | "Dev" | "Startups" | "Research";

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: NewsCategory;
  defaultOn: boolean;
}

export interface NewsItem {
  id: string;
  sourceId: string;
  sourceName: string;
  author?: string;
  title: string;
  url: string;
  publishedAt: number;
  /** The feed's own description/preview text. */
  summary?: string;
  category: NewsCategory;
  fetchedAt: number;
}
