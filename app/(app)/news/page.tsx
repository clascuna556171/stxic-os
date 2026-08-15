"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, Check, FileText, Newspaper, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { getNewsConfig, saveNewsConfig, saveNote } from "@/lib/hydrate";
import { aiChatOnce } from "@/lib/ai/client";
import { threadSummaryMessages } from "@/lib/news/summarizer";
import { newsItemToNote, NEWS_NOTE_FOLDER } from "@/lib/news/note";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { relativeTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { NewsCategory, NewsItem, NewsSource } from "@/lib/news/types";
import type { NewsConfig, Note } from "@/types";

const CATEGORY_ORDER: NewsCategory[] = ["AI", "Tech", "Dev", "Startups", "Research"];
const CATEGORIES: (NewsCategory | "all")[] = ["all", ...CATEGORY_ORDER];
const AUTO_REFRESH_MS = 15 * 60 * 1000;

function sourceEnabled(config: NewsConfig, id: string): boolean {
  const c = config.sources.find((s) => s.id === id);
  return c ? c.enabled : (NEWS_SOURCES.find((s) => s.id === id)?.defaultOn ?? true);
}

function enabledSourceIds(config: NewsConfig): string[] {
  return NEWS_SOURCES.filter((s) => sourceEnabled(config, s.id)).map((s) => s.id);
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [feedState, setFeedState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [now, setNow] = useState(0);
  const [config, setConfig] = useState<NewsConfig>({ sources: [], saved: [], readLater: [] });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [tldr, setTldr] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const enabled = enabledSourceIds(config);
    if (enabled.length === 0) return;
    try {
      const res = await fetch(`/api/news?on=${enabled.join(",")}`);
      const json = (await res.json()) as {
        ok: boolean;
        data?: NewsItem[];
        stale?: boolean;
        error?: string;
      };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Feed failed");
      setItems(json.data);
      setStale(Boolean(json.stale));
      setFeedState("ready");
    } catch (e) {
      setError((e as Error).message);
      setFeedState("error");
    }
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getNewsConfig();
      if (cancelled) return;
      if (res.ok) setConfig(res.data);
      setNow(Date.now());
      setConfigLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!configLoaded) return;
    void (async () => {
      await load();
    })();
  }, [configLoaded, load]);

  useEffect(() => {
    if (!configLoaded) return;
    const id = setInterval(() => void load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [configLoaded, load]);

  async function manualRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const itemsByUrl = useMemo(() => {
    const map = new Map<string, NewsItem>();
    for (const it of items) map.set(it.url, it);
    return map;
  }, [items]);

  const visible = useMemo(
    () => (category === "all" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );

  const sourcesByCategory = useMemo(() => {
    const grouped = new Map<NewsCategory, NewsSource[]>();
    for (const c of CATEGORY_ORDER) grouped.set(c, []);
    for (const s of NEWS_SOURCES) grouped.get(s.category)?.push(s);
    return [...grouped.entries()].filter(([, list]) => list.length > 0);
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<NewsCategory | "all", number>();
    counts.set("all", items.length);
    for (const c of CATEGORY_ORDER) counts.set(c, items.filter((i) => i.category === c).length);
    return counts;
  }, [items]);

  const enabledCount = NEWS_SOURCES.filter((s) => sourceEnabled(config, s.id)).length;

  function updateConfig(next: NewsConfig) {
    setConfig(next);
    void saveNewsConfig(next);
  }

  function toggleSource(id: string) {
    const existing = config.sources.find((s) => s.id === id);
    const sources = existing
      ? config.sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      : [...config.sources, { id, enabled: false }];
    updateConfig({ ...config, sources });
  }

  function setAllSources(on: boolean) {
    updateConfig({ ...config, sources: NEWS_SOURCES.map((s) => ({ id: s.id, enabled: on })) });
  }

  async function persistNote(note: Note): Promise<boolean> {
    const res = await saveNote(note);
    if (!res.ok) {
      toast({ title: "Couldn't save", description: res.error, variant: "danger" });
      return false;
    }
    return true;
  }

  function addSaved(url: string) {
    if (config.saved.includes(url)) return config;
    return { ...config, saved: [...config.saved, url] };
  }

  async function saveToNotes(item: NewsItem) {
    const ok = await persistNote(newsItemToNote(item));
    if (ok) {
      updateConfig(addSaved(item.url));
      toast({ title: "Saved to notes", variant: "success" });
    }
  }

  function saveForLater(item: NewsItem) {
    if (config.readLater.includes(item.url)) {
      toast({ title: "Already in your list" });
      return;
    }
    updateConfig({ ...config, readLater: [...config.readLater, item.url] });
    toast({ title: "Saved for later", variant: "success" });
  }

  function removeFromLater(url: string) {
    updateConfig({ ...config, readLater: config.readLater.filter((u) => u !== url) });
  }

  async function markRead(url: string) {
    const item = itemsByUrl.get(url);
    const note: Note = item
      ? newsItemToNote(item)
      : {
          id: crypto.randomUUID(),
          title: url,
          content: url,
          folder: NEWS_NOTE_FOLDER,
          tags: ["news"],
          favorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
    const ok = await persistNote(note);
    if (!ok) return;
    const next: NewsConfig = {
      ...addSaved(url),
      readLater: config.readLater.filter((u) => u !== url),
    };
    updateConfig(next);
    toast({ title: "Moved to notes", variant: "success" });
  }

  async function summarize(item: NewsItem) {
    if (summarizing) return;
    setSummarizing(item.url);
    try {
      const res = await aiChatOnce(threadSummaryMessages(item), "auto");
      setTldr((t) => ({ ...t, [item.url]: res.text }));
    } catch (e) {
      toast({ title: "TL;DR failed", description: (e as Error).message, variant: "danger" });
    } finally {
      setSummarizing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">News</h2>
          <p className="text-muted text-sm">Curated AI &amp; tech feed, RSS only — no paid APIs.</p>
        </div>
        <div className="flex items-center gap-2">
          {stale ? (
            <Badge variant="warning">
              <RefreshCw className="size-3.5" />
              Stale feed
            </Badge>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void manualRefresh()}>
            <RefreshCw className={cn(refreshing && "animate-spin motion-reduce:animate-none")} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="border-border rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-muted text-xs font-medium tracking-wide">
            Sources · {enabledCount}/{NEWS_SOURCES.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setAllSources(true)}>
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAllSources(false)}>
              None
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {sourcesByCategory.map(([cat, list]) => (
            <div key={cat} className="flex flex-col gap-1">
              <span className="text-muted text-[11px] font-medium tracking-wide uppercase">
                {cat}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {list.map((s) => {
                  const on = sourceEnabled(config, s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleSource(s.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        on
                          ? "border-accent/40 bg-accent/10 text-foreground"
                          : "border-border bg-surface text-muted hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn("size-1.5 rounded-full", on ? "bg-accent" : "bg-surface-2")}
                        aria-hidden
                      />
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="later">
            Later
            {config.readLater.length > 0 ? (
              <span className="bg-surface-2 text-muted rounded-full px-1.5 text-[10px]">
                {config.readLater.length}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "text-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  category === c && "bg-surface-2 text-foreground font-medium",
                )}
              >
                {c === "all" ? "All" : `#${c}`}
                <span className="text-muted text-xs tabular-nums">
                  {categoryCounts.get(c) ?? 0}
                </span>
              </button>
            ))}
          </div>

          {enabledCount === 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title="No sources enabled"
              description="Turn on sources above, or enable them all at once."
              action={
                <Button variant="secondary" size="sm" onClick={() => setAllSources(true)}>
                  Enable all
                </Button>
              }
            />
          ) : feedState === "loading" ? (
            <div className="border-border divide-y rounded-lg border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : feedState === "error" ? (
            <EmptyState
              icon={<Newspaper />}
              title="Couldn't load the feed"
              description={error}
              action={
                <Button variant="secondary" size="sm" onClick={() => void manualRefresh()}>
                  Try again
                </Button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title="Nothing in this category"
              description="Try a different filter."
            />
          ) : (
            <div className="border-border divide-y rounded-lg border">
              {visible.map((item) => (
                <FeedRow
                  key={item.id}
                  item={item}
                  now={now}
                  saved={config.saved.includes(item.url)}
                  later={config.readLater.includes(item.url)}
                  tldr={tldr[item.url]}
                  busy={summarizing === item.url}
                  onSummarize={() => void summarize(item)}
                  onSave={() => void saveToNotes(item)}
                  onLater={() => saveForLater(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="later">
          {config.readLater.length === 0 ? (
            <EmptyState
              icon={<Bookmark />}
              title="Nothing saved for later"
              description='Tap the bookmark icon on a story to queue it here, then "mark read" to move it into Notes.'
            />
          ) : (
            <div className="border-border divide-y rounded-lg border">
              {config.readLater.map((url) => {
                const item = itemsByUrl.get(url);
                return (
                  <div key={url} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <a
                        href={item?.url ?? url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground hover:text-accent line-clamp-2 text-sm font-medium"
                      >
                        {item?.title ?? url}
                      </a>
                      <p className="text-muted mt-1 text-xs">
                        {item
                          ? `${item.sourceName} · ${relativeTime(item.publishedAt, now)}`
                          : "Saved article"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mark read and move to notes"
                        onClick={() => void markRead(url)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove from list"
                        onClick={() => removeFromLater(url)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedRow(props: {
  item: NewsItem;
  now: number;
  saved: boolean;
  later: boolean;
  tldr?: string;
  busy: boolean;
  onSummarize: () => void;
  onSave: () => void;
  onLater: () => void;
}) {
  const { item, now, saved, later, tldr, busy } = props;
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:text-accent line-clamp-2 text-sm font-medium"
        >
          {item.title}
        </a>
        <p className="text-muted mt-1 flex flex-wrap items-center gap-x-2 text-xs">
          <span>{item.sourceName}</span>
          <span>·</span>
          <span>{relativeTime(item.publishedAt, now)}</span>
          {item.author ? (
            <>
              <span>·</span>
              <span>{item.author}</span>
            </>
          ) : null}
        </p>
        {tldr ? (
          <div className="text-foreground bg-surface-2 mt-2 rounded-lg p-3 text-sm whitespace-pre-wrap">
            {tldr}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Summarize"
          disabled={busy}
          onClick={props.onSummarize}
        >
          <Sparkles
            className={cn("size-4", busy && "text-accent animate-pulse motion-reduce:animate-none")}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={later ? "In your reading list" : "Save for later"}
          disabled={later}
          onClick={props.onLater}
        >
          <Bookmark className={cn("size-4", later && "text-accent")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={saved ? "Saved to notes" : "Save to notes"}
          disabled={saved}
          onClick={props.onSave}
        >
          {saved ? <Check className="text-accent size-4" /> : <FileText className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
