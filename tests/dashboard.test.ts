import { describe, expect, it } from "vitest";
import { clampMove, clampResize, compact, GRID_COLS } from "@/lib/dashboard/grid";
import { defaultLayout, WIDGETS } from "@/lib/dashboard/widgets";
import type { DashboardWidget } from "@/types";

describe("clampMove", () => {
  it("keeps x within the grid", () => {
    const w: DashboardWidget = { id: "a", x: 0, y: 0, w: 4, h: 2 };
    expect(clampMove(w, -5, 0).x).toBe(0);
    expect(clampMove(w, 99, 0).x).toBe(GRID_COLS - 4);
  });

  it("never allows negative y", () => {
    const w: DashboardWidget = { id: "a", x: 0, y: 2, w: 4, h: 2 };
    expect(clampMove(w, 0, -99).y).toBe(0);
  });
});

describe("clampResize", () => {
  it("clamps width to remaining columns", () => {
    const w: DashboardWidget = { id: "a", x: 8, y: 0, w: 4, h: 2 };
    expect(clampResize(w, 99, 0).w).toBe(GRID_COLS - 8);
  });

  it("keeps a minimum size of 1", () => {
    const w: DashboardWidget = { id: "a", x: 0, y: 0, w: 4, h: 2 };
    expect(clampResize(w, -99, -99).w).toBe(1);
    expect(clampResize(w, -99, -99).h).toBe(1);
  });
});

describe("compact", () => {
  it("pushes a widget below the one above it when they overlap", () => {
    const items: DashboardWidget[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 0, w: 6, h: 2 },
    ];
    const out = compact(items);
    expect(out.find((w) => w.id === "a")!.y).toBe(0);
    expect(out.find((w) => w.id === "b")!.y).toBe(2);
  });

  it("leaves side-by-side widgets alone", () => {
    const items: DashboardWidget[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 6, y: 0, w: 6, h: 2 },
    ];
    const out = compact(items);
    expect(out.find((w) => w.id === "b")!.y).toBe(0);
  });
});

describe("defaultLayout", () => {
  it("contains every non-opt-in widget with sane bounds", () => {
    const layout = defaultLayout();
    const optIn = new Set(["obsidianGraph"]);
    expect(layout.map((w) => w.id).sort()).toEqual(
      WIDGETS.map((w) => w.id)
        .filter((id) => !optIn.has(id))
        .sort(),
    );
    for (const w of layout) {
      expect(w.w).toBeGreaterThanOrEqual(1);
      expect(w.w).toBeLessThanOrEqual(GRID_COLS);
      expect(w.x + w.w).toBeLessThanOrEqual(GRID_COLS);
      expect(w.y).toBeGreaterThanOrEqual(0);
    }
  });
});
