/**
 * Dashboard grid math — pure, unit-tested. A 12-column grid where each widget
 * occupies (x, y, w, h) in grid units. `compact` greedily resolves vertical
 * overlaps while preserving each widget's base row. See docs/AGENT_EXTRAS.md
 * (section E).
 */

import type { DashboardWidget } from "@/types";

export const GRID_COLS = 12;

function overlapsX(ax: number, aw: number, bx: number, bw: number): boolean {
  return ax < bx + bw && ax + aw > bx;
}

/** Move a widget by (dx, dy) grid units, clamped into the grid. */
export function clampMove(item: DashboardWidget, dx: number, dy: number): DashboardWidget {
  const w = Math.min(Math.max(1, item.w), GRID_COLS);
  const x = Math.min(Math.max(0, item.x + dx), GRID_COLS - w);
  const y = Math.max(0, item.y + dy);
  return { ...item, x, y, w };
}

/** Resize a widget by (dw, dh), clamped to 1..remaining columns. */
export function clampResize(item: DashboardWidget, dw: number, dh: number): DashboardWidget {
  const w = Math.min(Math.max(1, item.w + dw), GRID_COLS - item.x);
  const h = Math.max(1, item.h + dh);
  return { ...item, w, h };
}

/** Resolve vertical overlaps: keep each item's base row, push down if needed. */
export function compact(items: DashboardWidget[]): DashboardWidget[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: DashboardWidget[] = [];
  for (const it of sorted) {
    let y = it.y;
    for (const p of placed) {
      if (overlapsX(it.x, it.w, p.x, p.w) && y < p.y + p.h) {
        y = p.y + p.h;
      }
    }
    placed.push({ ...it, y });
  }
  return placed;
}
