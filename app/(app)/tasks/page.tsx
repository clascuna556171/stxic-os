"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Kanban, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { TaskDialog } from "@/components/features/tasks/task-dialog";
import { deleteTask, listTasks, saveTask } from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";
import type { TaskItem, TaskStatus } from "@/types";

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2 } as const;

function ViewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 w-full" />
        </div>
      ))}
    </div>
  );
}

const KanbanBoard = dynamic(
  () => import("@/components/features/tasks/kanban-board").then((m) => m.KanbanBoard),
  { ssr: false, loading: () => <ViewSkeleton /> },
);

const CalendarView = dynamic(
  () => import("@/components/features/tasks/calendar-view").then((m) => m.CalendarView),
  { ssr: false, loading: () => <ViewSkeleton /> },
);

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | undefined>();
  const [defaultDueDate, setDefaultDueDate] = useState<number | undefined>();
  const [dialogKey, setDialogKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listTasks();
      if (cancelled) return;
      if (res.ok) {
        setTasks(res.data);
        setError("");
      } else {
        setError(res.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) ||
          a.title.localeCompare(b.title),
      ),
    [tasks],
  );

  function openNew(dueDate?: number) {
    setEditing(undefined);
    setDefaultDueDate(dueDate);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(task: TaskItem) {
    setEditing(task);
    setDefaultDueDate(undefined);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function onSave(task: TaskItem) {
    const res = await saveTask(task);
    if (res.ok) {
      setTasks((prev) =>
        prev.some((t) => t.id === task.id)
          ? prev.map((t) => (t.id === task.id ? task : t))
          : [task, ...prev],
      );
      toast({ title: "Saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  function onMove(task: TaskItem, status: TaskStatus) {
    const updated = { ...task, status, updatedAt: Date.now() };
    void saveTask(updated).then((res) => {
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        toast({ title: "Move failed", description: res.error, variant: "danger" });
      }
    });
  }

  function onDelete(id: string) {
    void deleteTask(id).then((res) => {
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setDialogOpen(false);
        toast({ title: "Deleted" });
      } else {
        toast({ title: "Delete failed", description: res.error, variant: "danger" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Tasks</h2>
          <p className="text-muted text-sm">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} · drag to change status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-border bg-surface-2 flex items-center gap-1 rounded-lg border p-1">
            {(
              [
                { id: "kanban", label: "Board", icon: <Kanban /> },
                { id: "calendar", label: "Calendar", icon: <CalendarDays /> },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setView(m.id)}
                className={cn(
                  "text-muted inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  view === m.id && "bg-surface text-foreground font-medium",
                )}
              >
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={() => openNew()}>
            <Plus />
            New task
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<ListTodo />} title="Couldn't load tasks" description={error} />
      ) : tasks.length === 0 && view === "kanban" ? (
        <EmptyState
          icon={<ListTodo />}
          title="No tasks yet"
          description="Add a task to populate your board."
          action={
            <Button variant="primary" onClick={() => openNew()}>
              <Plus />
              Add your first task
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <KanbanBoard tasks={sorted} onEdit={openEdit} onMove={onMove} />
      ) : (
        <CalendarView tasks={sorted} onEdit={openEdit} onAdd={(d) => openNew(d.getTime())} />
      )}

      <TaskDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultDueDate={defaultDueDate}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}
