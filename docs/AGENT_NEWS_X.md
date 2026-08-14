# AGENT: X/Twitter Tech News Hub (Stxic) — v1.5, flag-gated

## Ownership
- `lib/news/` (rss.ts, sources.ts, fetchers.ts, summarizer.ts) — FULL OWNERSHIP
- `app/news/` + components

## Mission
Curated AI/tech feed via RSS only (Nitter instances + RSS.app free + blogs:
Verge AI, TechCrunch AI, ArsTechnica, HNRSS, SimonWillison). No paid API.
Entries: `{id, source, author, title, url, publishedAt, summary, thread?}`.

## Features
1. Aggregate → dedupe by url → sort by publishedAt.
2. AI Thread Summarizer (`thread: true`) → TL;DR bullets (threadSubPrompt).
3. One-click Save to Notes → folder "Saved from News".
4. **Reading list:** "Save for later" queue → moves to Notes when read.
5. Filter chips: #AI #Tech #Dev #Startups #Research.
6. Manual refresh + auto-refresh 15 min; in-memory 15-min cache; stale >24h
   age pill; per-source on/off toggle.

## Contracts
- `fetchNews(): Promise<NewsItem[]>`, `saveToNotes(item)`,
  `saveForLater(item)`, `markRead(item)`.
- RSS failures: skip + log, never block feed.

## Done
- Feed loads + toggles; TL;DR works both AI backends; saved + reading-list
  items appear correctly; stale pills correct.
