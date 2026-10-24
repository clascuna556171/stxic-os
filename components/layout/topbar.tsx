"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, ShieldCheck } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { openCommandPalette } from "@/components/command/command-palette";
import { Kbd } from "@/components/ui/kbd";
import { BrandMark } from "@/components/brand/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";

export function Topbar() {
  const pathname = usePathname();
  const { user, demo } = useAuth();
  const currentItem = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  const isDashboard = pathname.startsWith("/dashboard");

  const displayName = demo
    ? user?.displayName || "Demo Guest"
    : user?.displayName || (user?.email ? user.email.split("@")[0] : "Operator");
  const initial = (displayName || "S").charAt(0).toUpperCase();

  const title = isDashboard ? `Welcome Back, ${displayName}` : (currentItem?.label ?? "Stxic");
  const subtitle = isDashboard
    ? "Here's what's happening with your workspace today."
    : demo
      ? "Sandbox workspace · Local encrypted session"
      : "End-to-end AES-256-GCM encrypted workspace";

  return (
    <header className="border-border bg-surface/80 sticky top-0 z-10 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:px-6 md:pt-0">
      {/* Left: Greeting / Section Title */}
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/dashboard" className="md:hidden" aria-label="Stxic Dashboard">
          <BrandMark size={24} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-foreground truncate text-sm font-bold tracking-tight md:text-base">
            {title}
          </h1>
          <p className="text-muted hidden truncate text-xs sm:block">{subtitle}</p>
        </div>
      </div>

      {/* Right: Search Pill, Status Bell, & Avatar */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={openCommandPalette}
          className="border-border bg-surface-2/60 hover:bg-surface-2 text-muted hover:text-foreground flex h-9 items-center justify-between gap-3 rounded-xl border px-3.5 text-xs transition-colors sm:min-w-[220px] cursor-pointer"
          aria-label="Open command palette"
        >
          <span className="hidden truncate sm:inline">Search for anything…</span>
          <span className="flex items-center gap-1.5">
            <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
            <Search className="size-3.5 shrink-0" />
          </span>
        </button>

        <Link
          href="/settings"
          className="border-border bg-surface-2/60 hover:bg-surface-2 text-muted hover:text-foreground relative flex size-9 items-center justify-center rounded-xl border transition-colors"
          title={demo ? "Sandbox Mode · Settings" : "Vault Encrypted · Settings"}
          aria-label="Security & Notifications"
        >
          {isDashboard ? (
            <Bell className="size-4" />
          ) : (
            <ShieldCheck className={demo ? "text-warning size-4" : "text-success size-4"} />
          )}
          <span
            className="bg-accent absolute top-2 right-2 size-1.5 rounded-full"
            aria-hidden
          />
        </Link>

        <Link
          href="/settings"
          className="border-accent/40 bg-accent/15 text-accent hover:bg-accent/25 flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors"
          title={`${displayName} · Account Settings`}
          aria-label="Account Settings"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
