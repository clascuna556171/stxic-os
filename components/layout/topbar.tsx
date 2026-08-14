"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { openCommandPalette } from "@/components/command/command-palette";
import { Kbd } from "@/components/ui/kbd";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Topbar() {
  const pathname = usePathname();
  const title = NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "Stxic";

  return (
    <header className="border-border bg-surface/60 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 backdrop-blur md:px-6">
      <h1 className="text-foreground text-sm font-semibold">{title}</h1>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="border-border bg-surface text-muted hover:bg-surface-2 flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Search</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
