/**
 * Minimal RSS 2.0 + Atom parser (no XML dependency). Pure and unit-tested
 * against fixtures. See docs/AGENT_NEWS_X.md.
 */

import type { NewsItem, NewsSource } from "./types";

/** Decode common HTML entities + numeric refs. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Strip CDATA markers + tags + collapse whitespace. Entities decode first. */
export function cleanText(raw: string): string {
  return decodeEntities(raw)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** First inner text of `<tag>` … `</tag>`, or "" when absent. */
function firstTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1] ?? "";
}

function extractAtomLink(block: string): string {
  const m = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  return m?.[1] ?? "";
}

function parseDate(raw: string, fallback: number): number {
  const t = Date.parse(raw.trim());
  return Number.isFinite(t) ? t : fallback;
}

/** Deterministic, url-derived id (djb2) for React keys + dedupe. */
export function stableId(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** "Email (Name)" → "Name"; plain emails/names pass through. */
function authorName(raw: string): string {
  const m = raw.match(/\(([^)]+)\)/);
  const name = m?.[1];
  return name ? name.trim() : raw.trim();
}

function parseRss(xml: string, source: NewsSource, now: number): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const title = cleanText(firstTag(block, "title") ?? "");
    const link = cleanText(firstTag(block, "link") ?? "");
    if (!title || !link) continue;
    const creator = firstTag(block, "dc:creator");
    const author = firstTag(block, "author");
    const authorRaw = creator || (author ? authorName(cleanText(author)) : "");
    const pubDate = firstTag(block, "pubDate");
    const description = cleanText(firstTag(block, "description") ?? "");
    items.push({
      id: stableId(link),
      sourceId: source.id,
      sourceName: source.name,
      author: authorRaw ? authorRaw : undefined,
      title,
      url: link,
      publishedAt: pubDate ? parseDate(pubDate, now) : now,
      summary: description || undefined,
      category: source.category,
      fetchedAt: now,
    });
  }
  return items;
}

function parseAtom(xml: string, source: NewsSource, now: number): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const title = cleanText(firstTag(block, "title") ?? "");
    const link = extractAtomLink(block);
    if (!title || !link) continue;
    const published = firstTag(block, "published") || firstTag(block, "updated");
    const summary = cleanText(firstTag(block, "summary") || firstTag(block, "content"));
    const author = cleanText(firstTag(block, "name") ?? "");
    items.push({
      id: stableId(link),
      sourceId: source.id,
      sourceName: source.name,
      author: author || undefined,
      title,
      url: link,
      publishedAt: published ? parseDate(published, now) : now,
      summary: summary || undefined,
      category: source.category,
      fetchedAt: now,
    });
  }
  return items;
}

export function parseFeed(xml: string, source: NewsSource, now = Date.now()): NewsItem[] {
  if (/<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml)) {
    return parseAtom(xml, source, now);
  }
  return parseRss(xml, source, now);
}

/** Dedupe by url (first wins) and sort newest-first. */
export function dedupeAndSort(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of items) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
  }
  out.sort((a, b) => b.publishedAt - a.publishedAt);
  return out;
}
