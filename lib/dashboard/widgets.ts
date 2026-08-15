/**
 * Dashboard widget registry — the set of available widgets and their default
 * layout. See docs/AGENT_EXTRAS.md (section E).
 */

import { compact } from "./grid";
import type { DashboardWidget } from "@/types";

export type WidgetId = "digest" | "tasks" | "focus" | "clocks" | "fx" | "income" | "habits";

export interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;
  minW: number;
  minH: number;
}

export const WIDGETS: WidgetDef[] = [
  {
    id: "digest",
    title: "Daily digest",
    description: "AI briefing from your day",
    minW: 6,
    minH: 2,
  },
  { id: "tasks", title: "Today's tasks", description: "What's due today", minW: 4, minH: 3 },
  { id: "focus", title: "Focus", description: "This week's focus time", minW: 3, minH: 2 },
  { id: "clocks", title: "World clocks", description: "Your pinned timezones", minW: 4, minH: 2 },
  { id: "fx", title: "FX converter", description: "Live currency rates", minW: 3, minH: 3 },
  { id: "income", title: "Income", description: "Monthly totals", minW: 6, minH: 3 },
  { id: "habits", title: "Habits", description: "Streaks at a glance", minW: 4, minH: 2 },
];

export const WIDGET_BY_ID: Record<WidgetId, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.id, w]),
) as Record<WidgetId, WidgetDef>;

/** Default grid arrangement (digest full-width, pairs below, habits last). */
export function defaultLayout(): DashboardWidget[] {
  return compact([
    { id: "digest", x: 0, y: 0, w: 12, h: 3 },
    { id: "tasks", x: 0, y: 3, w: 8, h: 4 },
    { id: "focus", x: 8, y: 3, w: 4, h: 4 },
    { id: "clocks", x: 0, y: 7, w: 8, h: 3 },
    { id: "fx", x: 8, y: 7, w: 4, h: 4 },
    { id: "income", x: 0, y: 11, w: 12, h: 4 },
    { id: "habits", x: 0, y: 15, w: 6, h: 3 },
  ]);
}
