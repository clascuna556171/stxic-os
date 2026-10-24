"use client";

import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  FileText,
  KeyRound,
  ListTodo,
  Lock,
  LogOut,
  Moon,
  Sun,
  Timer,
} from "lucide-react";
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

  const quickActions: CommandItem[] = [
    {
      id: "quick:task",
      title: "New Task",
      keywords: "new create task todo add",
      group: "Actions",
      icon: <ListTodo />,
      onSelect: () => router.push("/tasks"),
    },
    {
      id: "quick:note",
      title: "New Note",
      keywords: "new create note write document add",
      group: "Actions",
      icon: <FileText />,
      onSelect: () => router.push("/notes"),
    },
    {
      id: "quick:transaction",
      title: "Add Transaction",
      keywords: "new add transaction income expense money finance",
      group: "Actions",
      icon: <CircleDollarSign />,
      onSelect: () => router.push("/income"),
    },
    {
      id: "quick:vault",
      title: "New Vault Item",
      keywords: "new create password vault secret item",
      group: "Actions",
      icon: <KeyRound />,
      onSelect: () => router.push("/vault"),
    },
    {
      id: "quick:focus",
      title: "Start Focus Timer",
      keywords: "focus pomodoro timer start session",
      group: "Actions",
      icon: <Timer />,
      onSelect: () => router.push("/focus"),
    },
  ];

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

  return [...quickActions, ...navigate, ...actions];
}
