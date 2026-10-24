"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { isEnabled } from "@/lib/config/features";
import { useAuth } from "@/components/auth/auth-provider";
import { useTheme } from "@/components/theme/theme-provider";
import { Switch } from "@/components/ui/switch";
import { BrandMark } from "@/components/brand/brand-mark";

export function Sidebar() {
  const pathname = usePathname();
  const { user, demo, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const visibleItems = NAV_ITEMS.filter((item) => !item.feature || isEnabled(item.feature));
  const displayName = demo
    ? user?.displayName || "Demo Guest"
    : user?.displayName || (user?.email ? user.email.split("@")[0] : "Account");
  const initial = (displayName || "S").charAt(0).toUpperCase();

  return (
    <aside className="border-border bg-surface hidden w-60 shrink-0 flex-col border-r md:flex">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark size={26} />
          <span className="text-foreground text-base font-bold tracking-tight">Stxic</span>
        </Link>
        <span className="border-border bg-surface-2 text-muted rounded-full border px-2 py-0.5 font-mono text-[10px]">
          v1.5
        </span>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Main Navigation">
        {visibleItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                active
                  ? "bg-accent text-accent-fg font-semibold shadow-[0_6px_20px_-6px_var(--accent)]"
                  : "text-muted hover:bg-surface-2/70 hover:text-foreground",
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-accent-fg" : "text-muted",
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Inline Dark Mode Switch Row (matching ref1.png) */}
      <div className="px-3 pb-3">
        <div className="bg-surface-2/50 border-border flex items-center justify-between rounded-xl border px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Moon className="text-muted size-4 shrink-0" />
            <span className="text-muted text-xs font-medium">Dark Mode</span>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
        </div>
      </div>

      {/* Account & Session Footer */}
      <div className="border-border flex items-center justify-between gap-2 border-t px-3 py-3">
        <Link
          href="/settings"
          className={cn(
            "hover:bg-surface-2/70 group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors",
            pathname.startsWith("/settings") && "bg-surface-2",
          )}
          title="Edit Profile & Settings"
        >
          <div className="border-accent/40 bg-accent/15 text-accent flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
            {initial || <UserIcon className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-xs font-semibold">{displayName}</p>
            <p className="text-muted group-hover:text-accent truncate text-[11px] transition-colors">
              {demo ? "Sandbox · Edit Profile" : "Edit Profile"}
            </p>
          </div>
        </Link>

        <button
          type="button"
          className="text-muted hover:bg-danger/10 hover:text-danger flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
