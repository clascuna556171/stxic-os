"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { openCommandPalette } from "@/components/command/command-palette";
import { Kbd } from "@/components/ui/kbd";
import { BrandMark } from "@/components/brand/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils/cn";

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

export function Topbar() {
  const pathname = usePathname();
  const { user, demo } = useAuth();
  const currentItem = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
  const isDashboard = pathname.startsWith("/dashboard");

  const displayName = demo
    ? user?.displayName || "Demo Guest"
    : user?.displayName || (user?.email ? (user.email.split("@")[0] ?? "") : "") || "there";
  const initial = displayName.charAt(0).toUpperCase() || "S";

  const title = isDashboard
    ? `Welcome back, ${firstName(displayName)}`
    : (currentItem?.label ?? "Stxic");
  const subtitle = isDashboard
    ? new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : currentItem?.description;

  return (
    <header className="border-border bg-bg/80 sticky top-0 z-10 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:px-8 md:pt-0">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/dashboard" className="md:hidden" aria-label="Stxic dashboard">
          <BrandMark size={24} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-foreground truncate text-base font-semibold tracking-tight md:text-lg">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-muted hidden truncate text-xs sm:block" suppressHydrationWarning>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="border-border bg-surface hover:border-foreground/15 text-muted hover:text-foreground flex h-10 cursor-pointer items-center gap-2.5 rounded-full border px-3.5 text-sm transition-[border-color,color] duration-200 sm:w-64"
          aria-label="Search and jump (Ctrl+K)"
        >
          <Search className="size-4 shrink-0" />
          <span className="hidden flex-1 truncate text-left sm:inline">Search or jump to…</span>
          <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
        </button>

        <Link
          href="/settings"
          className={cn(
            "border-border bg-surface hover:border-foreground/15 hidden size-10 items-center justify-center rounded-full border transition-colors duration-200 sm:flex",
            demo ? "text-warning" : "text-success",
          )}
          title={demo ? "Demo sandbox — data stays on this device" : "Vault unlocked and encrypted"}
          aria-label={demo ? "Demo sandbox status" : "Encryption status"}
        >
          {demo ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}
        </Link>

        <Link
          href="/settings"
          className="bg-accent text-accent-fg flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-opacity duration-200 hover:opacity-90"
          title={`${displayName} — account settings`}
          aria-label="Account settings"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
