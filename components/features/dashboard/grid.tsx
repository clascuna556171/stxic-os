"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, GripVertical, X } from "lucide-react";
import { clampMove, clampResize, compact, GRID_COLS } from "@/lib/dashboard/grid";
import { cn } from "@/lib/utils/cn";
import type { DashboardWidget } from "@/types";

const ROW_HEIGHT = 96;
const GAP = 12;

interface GridItemProps {
  widget: DashboardWidget;
  children: ReactNode;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, dw: number, dh: number) => void;
  onHide: (id: string) => void;
  colWidth: () => number;
}

function GridItem({ widget, children, onMove, onResize, onHide, colWidth }: GridItemProps) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number } | null>(null);
  const rowStep = ROW_HEIGHT + GAP;

  function onDragDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }
  function onDragMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    const dx = Math.round((e.clientX - dragRef.current.x) / colWidth());
    const dy = Math.round((e.clientY - dragRef.current.y) / rowStep);
    if (dx === 0 && dy === 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    onMove(widget.id, dx, dy);
  }
  function onDragUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function onResizeDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { x: e.clientX, y: e.clientY };
  }
  function onResizeMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!resizeRef.current) return;
    const dw = Math.round((e.clientX - resizeRef.current.x) / colWidth());
    const dh = Math.round((e.clientY - resizeRef.current.y) / rowStep);
    if (dw === 0 && dh === 0) return;
    resizeRef.current = { x: e.clientX, y: e.clientY };
    onResize(widget.id, dw, dh);
  }
  function onResizeUp() {
    resizeRef.current = null;
  }

  const handleCls =
    "text-muted hover:text-foreground bg-surface/80 border-border rounded-md border p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100";

  return (
    <div
      className={cn("group relative", dragging && "z-10")}
      style={{
        gridColumn: `${widget.x + 1} / span ${widget.w}`,
        gridRow: `${widget.y + 1} / span ${widget.h}`,
      }}
    >
      <div className="h-full">{children}</div>

      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
        <button
          type="button"
          aria-label="Move widget"
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          onPointerCancel={onDragUp}
          className={cn(handleCls, "cursor-grab active:cursor-grabbing")}
          style={{ touchAction: "none" }}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Hide widget"
          onClick={() => onHide(widget.id)}
          className={cn(handleCls, "hidden group-hover:inline-flex")}
        >
          <X className="size-4" />
        </button>
      </div>

      <button
        type="button"
        aria-label="Resize widget"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
        className={cn(handleCls, "absolute right-1.5 bottom-1.5 z-10 cursor-nwse-resize")}
        style={{ touchAction: "none" }}
      >
        <ArrowDownRight className="size-4" />
      </button>
    </div>
  );
}

export function DashboardGrid({
  widgets,
  onChange,
  onHide,
  renderWidget,
}: {
  widgets: DashboardWidget[];
  onChange: (next: DashboardWidget[]) => void;
  onHide: (id: string) => void;
  renderWidget: (id: string) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const colWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 1;
    return el.clientWidth / GRID_COLS;
  }, []);

  const move = useCallback(
    (id: string, dx: number, dy: number) => {
      onChange(compact(widgets.map((w) => (w.id === id ? clampMove(w, dx, dy) : w))));
    },
    [widgets, onChange],
  );

  const resize = useCallback(
    (id: string, dw: number, dh: number) => {
      onChange(compact(widgets.map((w) => (w.id === id ? clampResize(w, dw, dh) : w))));
    },
    [widgets, onChange],
  );

  return (
    <div
      ref={containerRef}
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_HEIGHT}px`,
        gap: `${GAP}px`,
      }}
    >
      {widgets.map((w) => (
        <GridItem
          key={w.id}
          widget={w}
          onMove={move}
          onResize={resize}
          onHide={onHide}
          colWidth={colWidth}
        >
          {renderWidget(w.id)}
        </GridItem>
      ))}
    </div>
  );
}
