"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS, PRIMARY_MOBILE_ITEMS } from "@/components/layout/nav-items";
import { isEnabled } from "@/lib/config/features";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";
import type { NavItem } from "@/components/layout/nav-items";

function isVisible(item: NavItem): boolean {
  return !item.feature || isEnabled(item.feature);
}

/** Mobile bottom navigation (<768px): 4 core items + a "More" sheet. */
export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, demo, signOut } = useAuth();

  const primary = PRIMARY_MOBILE_ITEMS.filter(isVisible);
  const overflow = NAV_ITEMS.filter((i) => !primary.some((p) => p.href === i.href)).filter(isVisible);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      <nav className="border-border bg-surface/90 fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-[color] duration-150",
              isActive(item.href) ? "text-accent font-semibold" : "text-muted active:text-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 cursor-pointer flex-col items-center gap-1 py-2 text-[11px] font-medium transition-[color] duration-150",
            overflow.some((i) => isActive(i.href)) || moreOpen
              ? "text-accent font-semibold"
              : "text-muted active:text-foreground",
          )}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <LayoutGrid className="size-5" />
          More
        </button>
      </nav>

      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="bg-black/60 fixed inset-0 z-40 backdrop-blur-sm data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
          <DialogPrimitive.Content
            className="border-border bg-surface fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border shadow-2xl data-[state=closed]:translate-y-full data-[state=open]:translate-y-0"
            aria-describedby={undefined}
          >
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2.5">
                <BrandMark size={22} />
                <DialogPrimitive.Title className="text-foreground text-base font-semibold">
                  All sections
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close className="text-muted hover:bg-surface-2 hover:text-foreground rounded-md p-1 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
                <span className="sr-only">Close menu</span>
              </DialogPrimitive.Close>
            </div>

            <div className="grid max-h-[60dvh] grid-cols-3 gap-1 overflow-y-auto p-3">
              {overflow.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] transition-[background-color,color] duration-150",
                    isActive(item.href)
                      ? "bg-accent text-accent-fg font-semibold shadow-sm"
                      : "text-muted hover:bg-surface-2/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="border-border flex items-center justify-between border-t px-4 py-3">
              <div className="min-w-0">
                <p className="text-foreground truncate text-xs font-medium">
                  {demo ? "Demo Guest" : (user?.displayName || user?.email || "Account")}
                </p>
                <p className="text-muted truncate text-[11px]">
                  {demo ? "Local sandbox" : "Encrypted session"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void signOut();
                  }}
                  className="text-muted hover:bg-danger/10 hover:text-danger flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
