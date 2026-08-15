import {
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  FileText,
  FileUp,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Newspaper,
  Repeat,
  Settings,
  Sparkles,
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
  { label: "AI chat", href: "/ai", icon: Sparkles, feature: "ai" },
  { label: "Study", href: "/study", icon: CalendarDays, feature: "studyPlanner" },
  { label: "Semester", href: "/semester", icon: CalendarRange, feature: "semesterPlanner" },
  { label: "News", href: "/news", icon: Newspaper, feature: "news" },
  { label: "Convert", href: "/convert", icon: FileUp, feature: "convert" },
  { label: "Habits", href: "/habits", icon: Repeat, feature: "habits" },
  { label: "Settings", href: "/settings", icon: Settings },
];
