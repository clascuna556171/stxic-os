"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { TaskItem } from "@/types";
import { PriorityBadge } from "@/components/features/tasks/priority-badge";
import { isOverdue } from "@/lib/tasks";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export function TaskCard({ task, onEdit }: { task: TaskItem; onEdit: (t: TaskItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const overdue = isOverdue(task);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform) }}
      className={cn(
        "border-border bg-surface hover:bg-surface-2/60 hover:border-foreground/15 group flex flex-col gap-2.5 rounded-xl border p-3.5 transition-[background-color,border-color,box-shadow] duration-200",
        isDragging && "z-20 opacity-80 shadow-2xl shadow-black/40 ring-2 ring-accent",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="min-w-0 flex-1 text-left cursor-pointer focus-visible:outline-none"
        >
          <span
            className={cn(
              "text-foreground block break-words text-sm font-semibold tracking-tight transition-colors duration-150 group-hover:text-accent",
              task.status === "done" && "text-muted line-through group-hover:text-muted",
            )}
          >
            {task.title || "Untitled task"}
          </span>
        </button>
        <span
          {...listeners}
          {...attributes}
          className="text-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none rounded-lg p-1 transition-colors duration-150"
          aria-label="Drag to move"
        >
          <GripVertical className="size-4" />
        </span>
      </div>

      {task.description ? (
        <p className="text-muted line-clamp-2 break-words text-xs leading-relaxed">
          {task.description}
        </p>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <PriorityBadge priority={task.priority} />
        {task.dueDate != null ? (
          <span
            className={cn(
              "font-mono text-xs font-medium",
              overdue ? "text-danger" : "text-muted",
            )}
          >
            {formatDate(task.dueDate)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
