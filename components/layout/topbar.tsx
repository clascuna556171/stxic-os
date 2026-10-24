"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { openCommandPalette } from "@/components/command/command-palette";
import { Kbd } from "@/components/ui/kbd";
import { BrandMark } from "@/components/brand/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";

export function Topbar() {
  const pathname = usePathname();
  const { demo } = useAuth();
  const currentItem = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  const title = currentItem?.label ?? "Stxic";

  return (
    <header className="border-border bg-surface/75 sticky top-0 z-10 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:px-6 md:pt-0">
      {/* Left: Section Title */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/dashboard" className="md:hidden" aria-label="Stxic Dashboard">
          <BrandMark size={22} />
        </Link>
        <h1 className="text-foreground truncate text-sm font-semibold tracking-tight">{title}</h1>
      </div>

      {/* Right: Search & Encryption Status */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="border-border bg-surface hover:bg-surface-2 text-muted hover:text-foreground flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer"
          aria-label="Open command palette"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Search or jump…</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </button>

        <Link
          href="/settings"
          className="border-border bg-surface-2/60 hover:bg-surface-2 text-muted hover:text-foreground hidden sm:flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors"
          title="Account & Security Settings"
        >
          <ShieldCheck className={demo ? "text-warning size-3.5" : "text-success size-3.5"} />
          <span className="font-medium">{demo ? "Sandbox" : "Encrypted"}</span>
        </Link>
      </div>
    </header>
  );
}
