"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="border-border bg-surface hidden w-56 shrink-0 flex-col border-r md:flex">
      <div className="border-border flex h-14 items-center gap-2.5 border-b px-4">
        <BrandMark size={22} />
        <span className="text-foreground text-sm font-semibold tracking-tight">Stxic</span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-foreground font-medium"
                  : "text-muted hover:bg-surface-2/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-border flex items-center justify-between border-t p-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void signOut()}>
          <LogOut />
        </Button>
      </div>
    </aside>
  );
}
