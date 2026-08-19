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
        "border-border bg-surface hover:bg-surface-2/60 flex flex-col gap-2 rounded-lg border p-3 transition-colors",
        isDragging && "z-10 opacity-70 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
          <span
            className={cn(
              "text-foreground block break-words text-sm font-medium",
              task.status === "done" && "text-muted line-through",
            )}
          >
            {task.title || "Untitled task"}
          </span>
        </button>
        <span
          {...listeners}
          {...attributes}
          className="text-muted hover:text-foreground cursor-grab touch-none rounded p-0.5"
          aria-label="Drag to move"
        >
          <GripVertical className="size-4" />
        </span>
      </div>

      {task.description ? (
        <p className="text-muted break-words whitespace-pre-wrap text-xs">{task.description}</p>
      ) : null}

      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.dueDate != null ? (
          <span className={cn("text-xs", overdue ? "text-danger" : "text-muted")}>
            {formatDate(task.dueDate)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
