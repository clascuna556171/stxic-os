"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/command/command-palette";
import { useCommandItems } from "@/components/command/providers";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";

function ShellLoading() {
  return (
    <div className="flex min-h-dvh">
      <div className="border-border bg-surface hidden w-56 shrink-0 border-r md:block" />
      <div className="flex flex-1 flex-col">
        <div className="border-border h-14 border-b" />
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { initializing, locked } = useAuth();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const items = useCommandItems();

  useEffect(() => {
    if (!initializing && locked) router.replace("/pin");
  }, [initializing, locked, router]);

  if (initializing || locked) {
    return <ShellLoading />;
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pt-6 pb-20 md:px-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <CommandPalette items={items} open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </div>
  );
}
