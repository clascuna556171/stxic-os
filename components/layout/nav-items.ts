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
  /** One line shown under the page title in the top bar. */
  description?: string;
  /** Feature flag gate; undefined = always visible. */
  feature?: FeatureKey;
}

/**
 * Primary navigation. Only routes that actually exist are listed — feature
 * pages (vault, notes, tasks, income, …) get added here as their agents ship.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Vault",
    href: "/vault",
    icon: KeyRound,
    feature: "vault",
    description: "Logins and secrets, encrypted before they leave this device",
  },
  {
    label: "Notes",
    href: "/notes",
    icon: FileText,
    feature: "notes",
    description: "Markdown notes with wikilinks and tags",
  },
  {
    label: "Tasks",
    href: "/tasks",
    icon: ListTodo,
    feature: "tasks",
    description: "Tasks and assignments on a board or calendar",
  },
  {
    label: "Finance",
    href: "/income",
    icon: CircleDollarSign,
    feature: "income",
    description: "Income, expenses, accounts, and savings goals",
  },
  {
    label: "Focus",
    href: "/focus",
    icon: Timer,
    feature: "focus",
    description: "Pomodoro sessions, logged toward your weekly total",
  },
  {
    label: "AI chat",
    href: "/ai",
    icon: Sparkles,
    feature: "ai",
    description: "Ask about your data, or have it log tasks and transactions",
  },
  {
    label: "Study",
    href: "/study",
    icon: CalendarDays,
    feature: "studyPlanner",
    description: "Turn open assignments into a 7-day schedule",
  },
  {
    label: "Semester",
    href: "/semester",
    icon: CalendarRange,
    feature: "semesterPlanner",
    description: "Blackboard deadlines and your own tasks across the term",
  },
  {
    label: "News",
    href: "/news",
    icon: Newspaper,
    feature: "news",
    description: "AI and tech headlines from RSS sources you choose",
  },
  {
    label: "Convert",
    href: "/convert",
    icon: FileUp,
    feature: "convert",
    description: "Extract text from PDF, DOCX, XLSX, CSV, TXT, MD, or HTML",
  },
  {
    label: "Habits",
    href: "/habits",
    icon: Repeat,
    feature: "habits",
    description: "Daily check-ins and streaks",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Profile, security, appearance, and backups",
  },
];

/**
 * Mobile bottom bar shows a few core items + a "More" sheet for the rest.
 * Keep this to ≤4 (plus the More button) so labels stay readable at ~11px.
 */
export const PRIMARY_MOBILE_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Notes", href: "/notes", icon: FileText, feature: "notes" },
  { label: "Tasks", href: "/tasks", icon: ListTodo, feature: "tasks" },
  { label: "Finance", href: "/income", icon: CircleDollarSign, feature: "income" },
];
