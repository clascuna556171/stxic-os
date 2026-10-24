"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/brand/brand-mark";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  const pathname = usePathname();
  const { user, demo, signOut } = useAuth();

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="border-border bg-surface/85 backdrop-blur-md hidden w-[72px] shrink-0 flex-col items-center justify-between border-r py-4 z-20 md:flex">
        {/* Top: Brand Squircle */}
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/dashboard"
            className="group relative flex size-11 items-center justify-center rounded-2xl transition-transform hover:scale-105 active:scale-95"
            aria-label="Stxic Dashboard"
          >
            <BrandMark size={28} />
          </Link>

          {/* Nav Icons Stack */}
          <nav className="flex flex-col items-center gap-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex size-11 items-center justify-center rounded-2xl transition-all duration-200",
                        active
                          ? "bg-accent text-accent-fg shadow-md shadow-accent/20"
                          : "text-muted hover:bg-surface-2 hover:text-foreground",
                      )}
                      aria-label={item.label}
                    >
                      <item.icon className="size-5 transition-transform duration-150 group-hover:scale-110" />
                      {active ? (
                        <span
                          className="bg-accent absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full shadow-sm"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={14} className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Profile & Actions */}
        <div className="flex flex-col items-center gap-3 border-border/80 pt-3">
          <ThemeToggle />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted hover:bg-surface-2 hover:text-foreground flex size-10 items-center justify-center rounded-xl transition-colors"
                aria-label="User Profile"
              >
                <div className="border-border bg-surface-2 flex size-7 items-center justify-center rounded-full border text-xs font-semibold">
                  {user?.email ? (
                    user.email.charAt(0).toUpperCase()
                  ) : demo ? (
                    "D"
                  ) : (
                    <UserIcon className="size-3.5" />
                  )}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14}>
              <div className="text-xs">
                <p className="font-semibold text-foreground">
                  {demo ? "Demo Sandbox" : user?.email ?? "Account"}
                </p>
                <p className="text-muted">Encrypted Session</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-muted hover:bg-danger/10 hover:text-danger flex size-10 items-center justify-center rounded-xl transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14}>
              Sign out
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
