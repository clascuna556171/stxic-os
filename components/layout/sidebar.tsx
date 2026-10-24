"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { isEnabled } from "@/lib/config/features";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";

export function Sidebar() {
  const pathname = usePathname();
  const { user, demo, signOut } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.feature || isEnabled(item.feature));
  const displayName = demo
    ? user?.displayName || "Demo Guest"
    : user?.displayName || (user?.email ? user.email.split("@")[0] : "Account");
  const subtitle = demo ? "Sandbox session" : (user?.email ?? "Encrypted vault");
  const initial = (displayName || "S").charAt(0).toUpperCase();

  return (
    <aside className="border-border bg-surface hidden w-56 shrink-0 flex-col border-r md:flex">
      {/* Brand Header */}
      <div className="border-border flex h-14 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark size={24} />
          <span className="text-foreground text-sm font-semibold tracking-tight">Stxic</span>
        </Link>
        <span className="border-border bg-surface-2 text-muted rounded px-1.5 py-0.5 font-mono text-[10px]">
          v1.5
        </span>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Main Navigation">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-foreground font-medium"
                  : "text-muted hover:bg-surface-2/60 hover:text-foreground",
              )}
            >
              {active ? (
                <span
                  className="bg-accent absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r"
                  aria-hidden
                />
              ) : null}
              <item.icon className={cn("size-4 shrink-0", active && "text-accent")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Account & Session Footer */}
      <div className="border-border flex flex-col gap-2 border-t p-2.5">
        <Link
          href="/settings"
          className={cn(
            "hover:bg-surface-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
            pathname.startsWith("/settings") && "bg-surface-2",
          )}
          title="Account & Settings"
        >
          <div className="border-border bg-surface-2 text-accent flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
            {initial || <UserIcon className="size-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-medium">{displayName}</p>
            <p className="text-muted truncate text-[11px]">{subtitle}</p>
          </div>
        </Link>

        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted hover:text-danger h-8 gap-1.5 px-2 text-xs"
            aria-label="Sign out"
            onClick={() => void signOut()}
          >
            <LogOut className="size-3.5" />
            <span>Sign out</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
