import { describe, it, expect } from "vitest";
import { dedupeAndSort, parseFeed, stableId } from "@/lib/news/rss";
import { newsItemToNote, NEWS_NOTE_FOLDER } from "@/lib/news/note";
import { threadSummaryMessages } from "@/lib/news/summarizer";
import type { NewsItem, NewsSource } from "@/lib/news/types";

const source: NewsSource = {
  id: "test",
  name: "Test Feed",
  url: "https://example.com/feed",
  category: "AI",
  defaultOn: true,
};

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>T</title>
<item>
  <title>Hello &amp; welcome</title>
  <link>https://example.com/a</link>
  <pubDate>Mon, 15 Aug 2026 10:00:00 GMT</pubDate>
  <description><![CDATA[<p>A <b>great</b> story.</p>]]></description>
  <dc:creator>Jane Doe</dc:creator>
</item>
<item>
  <title>Second</title>
  <link>https://example.com/b</link>
  <pubDate>Tue, 16 Aug 2026 10:00:00 GMT</pubDate>
</item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <title>Atom post</title>
  <link href="https://example.com/c" rel="alternate"/>
  <published>2026-08-14T10:00:00Z</published>
  <summary>Atom summary text</summary>
  <author><name>John</name></author>
</entry>
</feed>`;

describe("parseFeed (RSS 2.0)", () => {
  it("extracts title, link, date, author and strips tags/CDATA", () => {
    const items = parseFeed(RSS, source, 0);
    expect(items).toHaveLength(2);
    const first = items[0]!;
    expect(first.title).toBe("Hello & welcome");
    expect(first.url).toBe("https://example.com/a");
    expect(first.author).toBe("Jane Doe");
    expect(first.summary).toBe("A great story.");
    expect(first.category).toBe("AI");
    expect(first.publishedAt).toBeGreaterThan(0);
  });
});

describe("parseFeed (Atom)", () => {
  it("extracts link, published and author name", () => {
    const items = parseFeed(ATOM, source, 0);
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Atom post");
    expect(items[0]!.url).toBe("https://example.com/c");
    expect(items[0]!.author).toBe("John");
    expect(items[0]!.summary).toBe("Atom summary text");
  });

  it("parses Reddit .rss entries (u/ author + comments permalink)", () => {
    const reddit = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<entry>
  <title>Neural nets are neat</title>
  <link href="https://www.reddit.com/r/MachineLearning/comments/abc123/neural_nets/" rel="alternate"/>
  <updated>2026-08-15T08:00:00Z</updated>
  <author><name>/u/researcher</name></author>
  <content type="html">&lt;div&gt;Post body here&lt;/div&gt;</content>
</entry>
</feed>`;
    const items = parseFeed(reddit, source, 0);
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Neural nets are neat");
    expect(items[0]!.url).toContain("/r/MachineLearning/comments/");
    expect(items[0]!.author).toBe("/u/researcher");
    expect(items[0]!.summary).toBe("Post body here");
  });
});

describe("dedupeAndSort", () => {
  it("removes duplicate urls and sorts newest-first", () => {
    const mk = (id: string, url: string, publishedAt: number): NewsItem => ({
      id,
      sourceId: "s",
      sourceName: "S",
      title: id,
      url,
      publishedAt,
      category: "Tech",
      fetchedAt: 0,
    });
    const items = [
      mk("a", "https://x/1", 100),
      mk("b", "https://x/2", 300),
      mk("dup", "https://x/1", 200),
    ];
    const out = dedupeAndSort(items);
    expect(out).toHaveLength(2);
    expect(out[0]!.url).toBe("https://x/2");
  });
});

describe("stableId", () => {
  it("is deterministic", () => {
    expect(stableId("https://x/y")).toBe(stableId("https://x/y"));
    expect(stableId("https://x/y")).not.toBe(stableId("https://x/z"));
  });
});

describe("newsItemToNote", () => {
  it("builds a note in the Saved from News folder", () => {
    const item: NewsItem = {
      id: "i",
      sourceId: "s",
      sourceName: "S",
      title: "T",
      url: "https://x/1",
      publishedAt: 1,
      summary: "sum",
      category: "AI",
      fetchedAt: 0,
    };
    const note = newsItemToNote(item, 123);
    expect(note.folder).toBe(NEWS_NOTE_FOLDER);
    expect(note.title).toBe("T");
    expect(note.content).toContain("https://x/1");
    expect(note.createdAt).toBe(123);
  });
});

describe("threadSummaryMessages", () => {
  it("prepends a system thread-summary prompt", () => {
    const item: NewsItem = {
      id: "i",
      sourceId: "s",
      sourceName: "S",
      title: "T",
      url: "https://x/1",
      publishedAt: 1,
      summary: "sum",
      category: "AI",
      fetchedAt: 0,
    };
    const msgs = threadSummaryMessages(item);
    expect(msgs[0]!.role).toBe("system");
    expect(msgs[0]!.content).toContain("TL;DR");
    expect(msgs[1]!.role).toBe("user");
  });
});
