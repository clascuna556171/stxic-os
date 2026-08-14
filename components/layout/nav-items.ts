import {
  CircleDollarSign,
  FileText,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Settings,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/lib/config/features";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Feature flag gate; undefined = always visible. */
  feature?: FeatureKey;
}

/**
 * Primary navigation. Only routes that actually exist are listed — feature
 * pages (vault, notes, tasks, income, …) get added here as their agents ship.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Vault", href: "/vault", icon: KeyRound, feature: "vault" },
  { label: "Notes", href: "/notes", icon: FileText, feature: "notes" },
  { label: "Tasks", href: "/tasks", icon: ListTodo, feature: "tasks" },
  { label: "Income", href: "/income", icon: CircleDollarSign, feature: "income" },
  { label: "Focus", href: "/focus", icon: Timer, feature: "focus" },
  { label: "Settings", href: "/settings", icon: Settings },
];
