"use client";

import { usePathname } from "next/navigation";
import { ChevronDown, Search, ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { openCommandPalette } from "@/components/command/command-palette";
import { Kbd } from "@/components/ui/kbd";
import { BrandMark } from "@/components/brand/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";

export function Topbar() {
  const pathname = usePathname();
  const { user, demo } = useAuth();
  const currentItem = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  const title = currentItem?.label ?? "Stxic";
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  const userGreeting = demo
    ? "Demo Guest"
    : user?.displayName
      ? user.displayName.split(" ")[0]
      : user?.email
        ? user.email.split("@")[0]
        : "Explorer";

  return (
    <header className="border-border/70 bg-surface/50 backdrop-blur-xl sticky top-0 z-10 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-4 pt-[env(safe-area-inset-top)] md:px-8 md:pt-0">
      {/* Left: Greeting / Section Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="md:hidden">
          <BrandMark size={24} />
        </span>
        <div className="flex flex-col">
          {isDashboard ? (
            <div className="flex items-center gap-2">
              <h1 className="text-foreground text-base font-semibold tracking-tight">
                Hello, {userGreeting}
              </h1>
              <span className="text-base" role="img" aria-label="wave">
                👋
              </span>
            </div>
          ) : (
            <h1 className="text-foreground text-base font-semibold tracking-tight">{title}</h1>
          )}
          <span className="text-muted text-[11px] font-medium uppercase tracking-wider">
            {isDashboard ? "Personal Workspace" : "Encrypted Section"}
          </span>
        </div>
      </div>

      {/* Right: Capsule Pill Selector, Search & Status */}
      <div className="flex items-center gap-2.5">
        {/* Project / Vault Capsule Selector (Sample 1 & 3) */}
        <div className="border-border/80 bg-surface-2/60 text-foreground hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="truncate max-w-[120px]">
            {demo ? "Sandbox Vault" : "Personal Vault"}
          </span>
          <ChevronDown className="text-muted size-3" />
        </div>

        {/* Global Search Pill (⌘K) */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="border-border/80 bg-surface hover:bg-surface-2 text-muted hover:text-foreground flex h-9 items-center gap-2.5 rounded-full border px-3.5 text-xs font-medium transition-all shadow-xs"
          aria-label="Open command palette"
        >
          <Search className="size-3.5" />
          <span className="hidden md:inline">Quick actions</span>
          <Kbd className="hidden md:inline-flex text-[10px]">⌘K</Kbd>
        </button>

        {/* Security Indicator */}
        <div
          className="border-border/60 bg-surface text-muted hidden xl:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
          title="Session verified with AES-GCM client encryption"
        >
          <ShieldCheck className="text-emerald-500 size-3.5" />
          <span className="text-foreground/80 font-medium">Secured</span>
        </div>
      </div>
    </header>
  );
}
