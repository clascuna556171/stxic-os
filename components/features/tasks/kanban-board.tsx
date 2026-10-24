"use client";

import { DndContext, closestCorners, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { TaskItem, TaskStatus } from "@/types";
import { STATUS_LABELS, TASK_STATUSES } from "@/lib/tasks";
import { TaskCard } from "@/components/features/tasks/task-card";
import { cn } from "@/lib/utils/cn";

function Column({
  status,
  tasks,
  onEdit,
}: {
  status: TaskStatus;
  tasks: TaskItem[];
  onEdit: (t: TaskItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className="flex flex-col gap-3">
      <header className="flex items-center justify-between px-1.5">
        <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
          {STATUS_LABELS[status]}
        </span>
        <span className="border-border bg-surface-2 text-muted rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium">
          {tasks.length}
        </span>
      </header>
      <div
        className={cn(
          "border-border bg-surface/30 flex min-h-[320px] flex-1 flex-col gap-2.5 rounded-2xl border border-dashed p-3 transition-[background-color,border-color] duration-200",
          isOver && "border-accent bg-accent/5",
        )}
      >
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onEdit={onEdit} />
        ))}
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="text-muted text-center text-xs">Drop tasks here</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: TaskItem[];
  onEdit: (t: TaskItem) => void;
  onMove: (task: TaskItem, status: TaskStatus) => void;
}

export function KanbanBoard({ tasks, onEdit, onMove }: KanbanBoardProps) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const status = over.id as TaskStatus;
    if (!TASK_STATUSES.includes(status)) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.status === status) return;
    onMove(task, status);
  }

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((s) => (
          <Column key={s} status={s} tasks={tasks.filter((t) => t.status === s)} onEdit={onEdit} />
        ))}
      </div>
    </DndContext>
  );
}
