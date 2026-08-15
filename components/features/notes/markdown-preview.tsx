"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/cn";
import { remarkObsidianLinks, TAG_SCHEME, WIKILINK_SCHEME } from "@/lib/obsidian/wikilinks";
import type { Note } from "@/types";

interface MarkdownPreviewProps {
  content: string;
  /** Optional note list to resolve `[[wikilinks]]` by title. */
  notes?: Note[];
  onNavigate?: (noteId: string) => void;
  onTagClick?: (tag: string) => void;
}

/** Markdown preview (GFM) + Obsidian `[[wikilinks]]` chips and `#tag` pills. */
export function MarkdownPreview({ content, notes, onNavigate, onTagClick }: MarkdownPreviewProps) {
  const byTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of notes ?? []) map.set(n.title.toLowerCase(), n.id);
    return map;
  }, [notes]);

  const components = useMemo<Components>(
    () => ({
      a: ({ children, href }) => {
        if (typeof href === "string" && href.startsWith(`${WIKILINK_SCHEME}://`)) {
          const target = decodeURIComponent(href.slice(WIKILINK_SCHEME.length + 3));
          const id = byTitle.get(target.toLowerCase());
          return (
            <button
              type="button"
              disabled={!id}
              onClick={() => id && onNavigate?.(id)}
              className={cn("wikilink-chip", !id && "is-missing")}
            >
              {children}
            </button>
          );
        }
        if (typeof href === "string" && href.startsWith(`${TAG_SCHEME}://`)) {
          const tag = decodeURIComponent(href.slice(TAG_SCHEME.length + 3));
          return (
            <button type="button" className="hashtag-pill" onClick={() => onTagClick?.(tag)}>
              {children}
            </button>
          );
        }
        return <a href={href}>{children}</a>;
      },
    }),
    [byTitle, onNavigate, onTagClick],
  );

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkObsidianLinks]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
