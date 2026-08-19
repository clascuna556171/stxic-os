"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderDown, FolderUp, Plug, Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
import { useObsidianBridge } from "@/components/features/obsidian/use-obsidian-bridge";
import { VaultBrowser } from "@/components/features/obsidian/vault-browser";
import { NOTE_TEMPLATES, newNoteFromTemplate, noteFolders, type NoteTemplate } from "@/lib/notes";
import { deleteNote, listNotes, saveNote } from "@/lib/hydrate";
import { buildNoteFromImport, importObsidianVault } from "@/lib/obsidian/format";
import { downloadObsidianNotes } from "@/lib/obsidian/export";
import { isEnabled } from "@/lib/config/features";
import { relativeTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { Note } from "@/types";

function snippet(content: string, max = 90): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

interface NoteRow {
  note: Note;
  snippet: string;
  updatedLabel: string;
}

/** Memoized list row — only re-renders when its own note changes. */
const NoteListItem = memo(function NoteListItem({
  row,
  active,
  onSelect,
}: {
  row: NoteRow;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const n = row.note;
  return (
    <button
      type="button"
      onClick={() => onSelect(n.id)}
      className={cn(
        "hover:bg-surface-2/60 flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors",
        active && "bg-surface-2",
      )}
    >
      <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
        {n.favorite ? <Star className="text-accent size-3 shrink-0 fill-current" /> : null}
        <span className="truncate">{n.title || "Untitled"}</span>
      </span>
      {row.snippet ? <span className="text-muted truncate text-xs">{row.snippet}</span> : null}
      <span className="text-muted text-[11px]">{row.updatedLabel}</span>
    </button>
  );
});

const PAGE_SIZE = 100;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [folder, setFolder] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [importing, setImporting] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);
  const bridge = useObsidianBridge();
  const obsidianLive = isEnabled("obsidianLive");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listNotes();
      if (cancelled) return;
      if (res.ok) {
        setNotes(res.data);
        setError("");
        const open = new URLSearchParams(window.location.search).get("open");
        if (open) setActiveId(open);
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

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of notes) counts.set(n.folder, (counts.get(n.folder) ?? 0) + 1);
    return counts;
  }, [notes]);

  const favoritesCount = useMemo(() => notes.filter((n) => n.favorite).length, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = notes
      .filter((n) => {
        if (folder === "favorites" && !n.favorite) return false;
        if (folder !== "all" && folder !== "favorites" && n.folder !== folder) return false;
        if (q) {
          const hay = `${n.title} ${n.content} ${n.folder} ${n.tags.join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return list.map((n) => ({
      note: n,
      snippet: n.content ? snippet(n.content) : "",
      updatedLabel: relativeTime(n.updatedAt),
    }));
  }, [notes, folder, query]);

  const visible = filtered.slice(0, visibleCount);

  const active = notes.find((n) => n.id === activeId) ?? null;

  function changeFolder(f: string) {
    setFolder(f);
    setVisibleCount(PAGE_SIZE);
  }

  function changeQuery(v: string) {
    setQuery(v);
    setVisibleCount(PAGE_SIZE);
  }

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

  async function onImportFiles(files: FileList) {
    setImporting(true);
    try {
      const parsed = await importObsidianVault(Array.from(files));
      if (parsed.length === 0) {
        toast({
          title: "No Markdown files",
          description: "Pick an Obsidian vault folder containing .md files.",
          variant: "danger",
        });
        return;
      }
      const existingById = new Map(notes.map((n) => [n.id, n]));
      let created = 0;
      let updated = 0;
      for (const p of parsed) {
        const existing = p.stxicId ? existingById.get(p.stxicId) : undefined;
        const note = buildNoteFromImport(p, existing);
        const res = await saveNote(note);
        if (!res.ok) continue;
        if (existing) updated++;
        else created++;
        existingById.set(note.id, note);
      }
      setNotes([...existingById.values()]);
      toast({
        title: "Vault imported",
        description: `${created} new · ${updated} updated`,
        variant: "success",
      });
    } catch (err) {
      toast({ title: "Import failed", description: (err as Error).message, variant: "danger" });
    } finally {
      setImporting(false);
    }
  }

  function exportAll() {
    if (notes.length === 0) {
      toast({ title: "Nothing to export", description: "Create a note first." });
      return;
    }
    downloadObsidianNotes(notes);
    toast({ title: "Exporting notes", description: `${notes.length} .md files downloading.` });
  }

  async function pushToObsidian(note: Note) {
    const res = await bridge.pushNote(note);
    if (res.ok) toast({ title: "Saved to Obsidian", variant: "success" });
    else toast({ title: "Push failed", description: res.error.message, variant: "danger" });
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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Notes</h2>
          <p className="text-muted text-sm">
            {notes.length} note{notes.length === 1 ? "" : "s"} · autosaves as you type
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {obsidianLive ? (
            <Button variant="secondary" onClick={() => setVaultOpen(true)}>
              <Plug />
              Obsidian
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => importRef.current?.click()}
            disabled={importing}
          >
            <FolderUp />
            {importing ? "Importing…" : "Import vault"}
          </Button>
          <Button variant="secondary" onClick={exportAll}>
            <FolderDown />
            Export all
          </Button>
          <Button variant="primary" onClick={() => createNote(NOTE_TEMPLATES[0]!)}>
            <Plus />
            New note
          </Button>
        </div>
      </header>

      <input
        ref={importRef}
        type="file"
        accept=".md"
        className="hidden"
        {...({ webkitdirectory: "" } as unknown as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={(e) => {
          if (e.target.files?.length) void onImportFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="border-border flex min-h-0 flex-1 overflow-hidden rounded-xl border">
        <aside
          className={cn(
            "bg-surface md:border-border w-full flex-col md:w-72 md:border-r",
            active ? "hidden md:flex" : "flex",
          )}
        >
          <nav className="flex gap-1 overflow-x-auto p-2 md:max-h-44 md:flex-col md:overflow-y-auto md:overflow-x-visible">
            {[
              { id: "all", label: "All notes", count: notes.length },
              { id: "favorites", label: "Favorites", count: favoritesCount },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => changeFolder(f.id)}
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
                  onClick={() => changeFolder(f)}
                  className={cn(
                    "text-muted hover:text-foreground flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    folder === f && "bg-surface-2 text-foreground font-medium",
                  )}
                >
                  {f}
                  <span className="text-muted text-xs">{folderCounts.get(f) ?? 0}</span>
                </button>
              ) : null,
            )}
          </nav>

          <div className="border-border border-t p-2">
            <div className="relative">
              <Search className="text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder="Search notes…"
                className="pl-8"
                aria-label="Search notes"
              />
            </div>
          </div>

          <div className="border-border min-h-0 flex-1 overflow-y-auto border-t">
            {loading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="text-muted p-4 text-sm">
                {query ? "No notes match your search." : "No notes here yet."}
              </p>
            ) : (
              <div className="p-2">
                {visible.map((row) => (
                  <NoteListItem
                    key={row.note.id}
                    row={row}
                    active={row.note.id === activeId}
                    onSelect={setActiveId}
                  />
                ))}
                {filtered.length > visibleCount ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="text-muted hover:text-foreground hover:bg-surface-2/60 w-full rounded-lg px-3 py-2 text-center text-xs transition-colors"
                  >
                    Show {filtered.length - visibleCount} more
                  </button>
                ) : null}
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
              notes={notes}
              onBack={() => setActiveId(null)}
              onSaved={onSaved}
              onDelete={(id) => setDeleting(notes.find((n) => n.id === id) ?? null)}
              onToggleFavorite={onToggleFavorite}
              onNavigate={setActiveId}
              onPushToObsidian={obsidianLive ? pushToObsidian : undefined}
              obsidianConnected={bridge.connected}
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

      {obsidianLive ? (
        <VaultBrowser
          open={vaultOpen}
          onOpenChange={setVaultOpen}
          bridge={bridge}
          notes={notes}
          onNotesChanged={setNotes}
          activeNote={active}
          onOpenNote={setActiveId}
        />
      ) : null}
    </div>
  );
}
