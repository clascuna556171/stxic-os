"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, GripVertical, X } from "lucide-react";
import { compact, GRID_COLS } from "@/lib/dashboard/grid";
import { cn } from "@/lib/utils/cn";
import type { DashboardWidget } from "@/types";

const ROW_HEIGHT = 96;
const GAP = 12;

interface GridItemProps {
  widget: DashboardWidget;
  children: ReactNode;
  onCommit: (id: string, target: DashboardWidget) => void;
  onHide: (id: string) => void;
  colWidth: () => number;
}

interface DragState {
  kind: "move" | "resize";
  startPx: number;
  startPy: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

interface Preview {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

/**
 * Drag/resize with a live preview that only commits on release. No
 * `compact()` runs while the pointer moves, so the other widgets never jump
 * around mid-drag — overlaps resolve once, on drop.
 */
function GridItem({ widget, children, onCommit, onHide, colWidth }: GridItemProps) {
  const [interaction, setInteraction] = useState<null | "move" | "resize">(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const previewRef = useRef<Preview | null>(null);
  const rowStep = ROW_HEIGHT + GAP;

  function updatePreview(p: Preview) {
    previewRef.current = p;
    setPreview(p);
  }

  function beginDrag(e: React.PointerEvent<HTMLButtonElement>, kind: "move" | "resize") {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind,
      startPx: e.clientX,
      startPy: e.clientY,
      startX: widget.x,
      startY: widget.y,
      startW: widget.w,
      startH: widget.h,
    };
    previewRef.current = null;
    setPreview(null);
    setInteraction(kind);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "move") {
      const dx = Math.round((e.clientX - d.startPx) / colWidth());
      const dy = Math.round((e.clientY - d.startPy) / rowStep);
      updatePreview({
        x: Math.min(Math.max(0, d.startX + dx), GRID_COLS - d.startW),
        y: Math.max(0, d.startY + dy),
      });
    } else {
      const dw = Math.round((e.clientX - d.startPx) / colWidth());
      const dh = Math.round((e.clientY - d.startPy) / rowStep);
      updatePreview({
        w: Math.min(Math.max(1, d.startW + dw), GRID_COLS - d.startX),
        h: Math.max(1, d.startH + dh),
      });
    }
  }

  function endDrag() {
    const d = dragRef.current;
    const p = previewRef.current;
    if (d && p) {
      onCommit(widget.id, { ...widget, ...p });
    }
    dragRef.current = null;
    previewRef.current = null;
    setPreview(null);
    setInteraction(null);
  }

  const eff: DashboardWidget = preview
    ? {
        ...widget,
        x: preview.x ?? widget.x,
        y: preview.y ?? widget.y,
        w: preview.w ?? widget.w,
        h: preview.h ?? widget.h,
      }
    : widget;

  const handleCls =
    "text-muted hover:text-foreground bg-surface/80 border-border rounded-md border p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100";

  return (
    <div
      className={cn("group relative select-none", interaction && "z-10")}
      style={{
        gridColumn: `${eff.x + 1} / span ${eff.w}`,
        gridRow: `${eff.y + 1} / span ${eff.h}`,
      }}
    >
      <div
        className={cn(
          "h-full",
          interaction === "move" && "ring-accent/50 rounded-xl ring-2",
          interaction === "resize" && "outline-accent/50 rounded-xl outline outline-2",
        )}
      >
        {children}
      </div>

      <div className="absolute top-1.5 left-1.5 z-10 hidden items-center gap-1 md:flex">
        <button
          type="button"
          aria-label="Move widget"
          onPointerDown={(e) => beginDrag(e, "move")}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
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
        onPointerDown={(e) => beginDrag(e, "resize")}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          handleCls,
          "absolute right-1.5 bottom-1.5 z-10 hidden cursor-nwse-resize md:block",
        )}
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

  const commit = useCallback(
    (id: string, target: DashboardWidget) => {
      onChange(compact(widgets.map((w) => (w.id === id ? target : w))));
    },
    [widgets, onChange],
  );

  return (
    <div
      ref={containerRef}
      className="flex select-none flex-col md:grid"
      style={{
        gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_HEIGHT}px`,
        gap: `${GAP}px`,
      }}
    >
      {widgets.map((w) => (
        <GridItem key={w.id} widget={w} onCommit={commit} onHide={onHide} colWidth={colWidth}>
          {renderWidget(w.id)}
        </GridItem>
      ))}
    </div>
  );
}
