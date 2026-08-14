"use client";

import { useRouter } from "next/navigation";
import { Lock, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import type { CommandItem } from "./command-palette";

/**
 * Command palette providers. Feature agents add their own entries here
 * (tasks, notes, passwords, news, habits, focus) as they ship.
 */
export function useCommandItems(): CommandItem[] {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { lock, signOut } = useAuth();

  const navigate: CommandItem[] = NAV_ITEMS.map((n) => ({
    id: `nav:${n.href}`,
    title: n.label,
    keywords: n.label,
    group: "Navigate",
    icon: <n.icon />,
    onSelect: () => router.push(n.href),
  }));

  const actions: CommandItem[] = [
    {
      id: "action:theme",
      title: theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
      keywords: "theme dark light appearance",
      group: "Actions",
      icon: theme === "dark" ? <Sun /> : <Moon />,
      onSelect: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    {
      id: "action:lock",
      title: "Lock now",
      keywords: "lock pin",
      group: "Actions",
      icon: <Lock />,
      onSelect: () => lock(),
    },
    {
      id: "action:signout",
      title: "Sign out",
      keywords: "logout sign out",
      group: "Actions",
      icon: <LogOut />,
      onSelect: () => void signOut(),
    },
  ];

  return [...navigate, ...actions];
}
