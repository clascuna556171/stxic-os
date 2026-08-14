"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { NoteEditor } from "@/components/features/notes/note-editor";
import { NOTE_TEMPLATES, newNoteFromTemplate, noteFolders, type NoteTemplate } from "@/lib/notes";
import { deleteNote, listNotes, saveNote } from "@/lib/hydrate";
import { relativeTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { Note } from "@/types";

function snippet(content: string, max = 90): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listNotes();
      if (cancelled) return;
      if (res.ok) {
        setNotes(res.data);
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

  const folders = useMemo(() => noteFolders(notes), [notes]);

  const filtered = useMemo(() => {
    const list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (folder === "favorites") return list.filter((n) => n.favorite);
    if (folder !== "all") return list.filter((n) => n.folder === folder);
    return list;
  }, [notes, folder]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  async function createNote(template: NoteTemplate) {
    const note = newNoteFromTemplate(template);
    const res = await saveNote(note);
    if (res.ok) {
      setNotes((prev) => [note, ...prev]);
      setActiveId(note.id);
    } else {
      toast({ title: "Couldn't create note", description: res.error, variant: "danger" });
    }
  }

  function onSaved(updated: Note) {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  function onToggleFavorite(note: Note) {
    const updated = { ...note, favorite: !note.favorite, updatedAt: Date.now() };
    void saveNote(updated).then((res) => {
      if (res.ok) onSaved(updated);
      else toast({ title: "Save failed", description: res.error, variant: "danger" });
    });
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await deleteNote(deleting.id);
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== deleting.id));
      if (activeId === deleting.id) setActiveId(null);
      toast({ title: "Deleted" });
    } else {
      toast({ title: "Delete failed", description: res.error, variant: "danger" });
    }
    setDeleting(null);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Notes</h2>
          <p className="text-muted text-sm">
            {notes.length} note{notes.length === 1 ? "" : "s"} · autosaves as you type
          </p>
        </div>
        <Button variant="primary" onClick={() => createNote(NOTE_TEMPLATES[0]!)}>
          <Plus />
          New note
        </Button>
      </header>

      <div className="border-border flex min-h-0 flex-1 overflow-hidden rounded-xl border">
        <aside
          className={cn(
            "bg-surface md:border-border w-full flex-col md:w-72 md:border-r",
            active ? "hidden md:flex" : "flex",
          )}
        >
          <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible">
            {[
              { id: "all", label: "All notes", count: notes.length },
              {
                id: "favorites",
                label: "Favorites",
                count: notes.filter((n) => n.favorite).length,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFolder(f.id)}
                className={cn(
                  "text-muted hover:text-foreground flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  folder === f.id && "bg-surface-2 text-foreground font-medium",
                )}
              >
                {f.label}
                <span className="text-muted text-xs">{f.count}</span>
              </button>
            ))}
            {folders.map((f) =>
              f ? (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFolder(f)}
                  className={cn(
                    "text-muted hover:text-foreground flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    folder === f && "bg-surface-2 text-foreground font-medium",
                  )}
                >
                  {f}
                  <span className="text-muted text-xs">
                    {notes.filter((n) => n.folder === f).length}
                  </span>
                </button>
              ) : null,
            )}
          </nav>

          <div className="border-border min-h-0 flex-1 overflow-y-auto border-t">
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted p-4 text-sm">No notes here yet.</p>
            ) : (
              <div className="p-2">
                {filtered.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setActiveId(n.id)}
                    className={cn(
                      "hover:bg-surface-2/60 flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
                      n.id === activeId && "bg-surface-2",
                    )}
                  >
                    <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                      {n.favorite ? (
                        <Star className="text-accent size-3 shrink-0 fill-current" />
                      ) : null}
                      <span className="truncate">{n.title || "Untitled"}</span>
                    </span>
                    <span className="text-muted truncate text-xs">
                      {snippet(n.content) || "Empty note"}
                    </span>
                    <span className="text-muted text-[11px]">{relativeTime(n.updatedAt)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className={cn("min-w-0 flex-1", active ? "flex" : "hidden md:flex")}>
          {active ? (
            <NoteEditor
              key={active.id}
              note={active}
              folders={folders}
              onBack={() => setActiveId(null)}
              onSaved={onSaved}
              onDelete={(id) => setDeleting(notes.find((n) => n.id === id) ?? null)}
              onToggleFavorite={onToggleFavorite}
            />
          ) : error ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState icon={<FileText />} title="Couldn't load notes" description={error} />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <EmptyState
                icon={<FileText />}
                title="No note selected"
                description="Start writing, or begin from a template."
              />
              <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {NOTE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => createNote(t)}
                    className="border-border bg-surface hover:bg-surface-2 flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors"
                  >
                    <span className="text-foreground text-sm font-medium">{t.label}</span>
                    <span className="text-muted text-xs">
                      {t.folder ? `Folder: ${t.folder}` : "No folder"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.title || "Untitled"}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the note. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
