"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import fuzzysort from "fuzzysort";
import { Command as CommandIcon, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Kbd } from "@/components/ui/kbd";

export interface CommandItem {
  id: string;
  title: string;
  /** Keywords for fuzzy matching (comma-separated or spaced). */
  keywords?: string;
  group: string;
  icon?: ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  items: CommandItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Open the palette from anywhere (e.g. a topbar button). */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("stxic:open-palette"));
}

export function CommandPalette({ items, open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset the query and selected index when the palette closes (render-phase state adjustment).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    const onCustom = () => onOpenChange(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("stxic:open-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("stxic:open-palette", onCustom);
    };
  }, [onOpenChange]);

  const results = query.trim()
    ? fuzzysort.go(query, items, { keys: ["title", "keywords"] }).map((r) => r.obj)
    : items;

  const [prevQuery, setPrevQuery] = useState(query);

  // Keep selectedIndex within bounds when results change (render-phase state adjustment)
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>("[data-active]");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = results[selectedIndex];
      if (current) {
        current.onSelect();
        onOpenChange(false);
      }
    }
  };

  const grouped = results.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-150 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <DialogPrimitive.Content className="border-border bg-surface fixed top-[15%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border shadow-2xl transition-all duration-150 data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100">
          <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>
          <div className="border-border flex items-center gap-2 border-b px-4">
            <CommandIcon className="text-muted size-4" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands…"
              aria-label="Search commands"
              className="text-foreground placeholder:text-muted h-12 w-full bg-transparent text-sm outline-none"
            />
            <Kbd>Esc</Kbd>
          </div>

          <div ref={listRef} className="max-h-72 overflow-y-auto p-2">
            {Object.keys(grouped).length === 0 ? (
              <p className="text-muted px-3 py-8 text-center text-sm">No results</p>
            ) : (
              Object.entries(grouped).map(([group, groupItems]) => (
                <div key={group} className="mb-1">
                  <p className="text-muted px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase">
                    {group}
                  </p>
                  {groupItems.map((item) => {
                    const itemIndex = results.indexOf(item);
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.onSelect();
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        data-active={isSelected ? "" : undefined}
                        className={cn(
                          "text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                          "data-[active]:bg-surface-2",
                        )}
                      >
                        {item.icon ? (
                          <span className="text-muted [&_svg]:size-4">{item.icon}</span>
                        ) : null}
                        <span className="flex-1">{item.title}</span>
                        {isSelected ? <CornerDownLeft className="text-muted size-3.5" /> : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
