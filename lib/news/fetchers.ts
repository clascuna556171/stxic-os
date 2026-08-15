/**
 * News aggregation — fetch + parse + dedupe + cache (server-side only, since
 * RSS is CORS-blocked in the browser). In-memory 15-min cache; failures per
 * source are skipped and never block the feed. See docs/AGENT_NEWS_X.md.
 */

import { DEFAULT_SOURCE_IDS, sourceById } from "./sources";
import { dedupeAndSort, parseFeed } from "./rss";
import type { NewsItem, NewsSource } from "./types";

const CACHE_TTL_MS = 15 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const cache = new Map<string, { items: NewsItem[]; fetchedAt: number }>();

async function fetchFeed(source: NewsSource): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`${source.id} HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export interface NewsFeedResult {
  items: NewsItem[];
  fetchedAt: number;
  stale: boolean;
}

export async function fetchNews(sourceIds?: string[]): Promise<NewsFeedResult> {
  const ids = sourceIds && sourceIds.length > 0 ? sourceIds : DEFAULT_SOURCE_IDS;
  const key = ids.slice().sort().join(",");

  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      items: cached.items,
      fetchedAt: cached.fetchedAt,
      stale: Date.now() - cached.fetchedAt > STALE_MS,
    };
  }

  const sources = ids.map(sourceById).filter((s): s is NewsSource => s != null);
  const results = await Promise.allSettled(
    sources.map((s) => fetchFeed(s).then((x) => parseFeed(x, s))),
  );

  const items: NewsItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    // r.status === "rejected" → skip + log, never block the feed
  }

  const unique = dedupeAndSort(items);
  const fetchedAt = Date.now();
  cache.set(key, { items: unique, fetchedAt });

  return { items: unique, fetchedAt, stale: false };
}
