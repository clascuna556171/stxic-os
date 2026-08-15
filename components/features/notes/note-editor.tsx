"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Columns2,
  Download,
  Eye,
  PenLine,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { saveNote } from "@/lib/hydrate";
import { downloadObsidianNote } from "@/lib/obsidian/export";
import { cn } from "@/lib/utils/cn";
import type { Note } from "@/types";

const MarkdownPreview = dynamic(() => import("./markdown-preview").then((m) => m.MarkdownPreview), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full" />,
});

type ViewMode = "write" | "preview" | "split";

interface NoteEditorProps {
  note: Note;
  folders: string[];
  notes: Note[];
  onBack: () => void;
  onSaved: (n: Note) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (n: Note) => void;
  onNavigate: (id: string) => void;
  onPushToObsidian?: (n: Note) => void;
  obsidianConnected?: boolean;
}

export function NoteEditor({
  note,
  folders,
  notes,
  onBack,
  onSaved,
  onDelete,
  onToggleFavorite,
  onNavigate,
  onPushToObsidian,
  obsidianConnected,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [folder, setFolder] = useState(note.folder);
  const [tagsText, setTagsText] = useState(note.tags.join(", "));
  const [view, setView] = useState<ViewMode>("write");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");

  const draft = useRef({ title, content, folder, tagsText });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update<K extends keyof typeof draft.current>(key: K, value: string) {
    draft.current[key] = value;
    markDirty();
  }

  function markDirty() {
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), 1000);
  }

  function buildNote(): Note {
    const d = draft.current;
    return {
      ...note,
      title: d.title.trim() || "Untitled",
      content: d.content,
      folder: d.folder.trim(),
      tags: d.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      updatedAt: Date.now(),
    };
  }

  async function persist() {
    setSaveState("saving");
    const updated = buildNote();
    const res = await saveNote(updated);
    if (res.ok) {
      setSaveState("saved");
      onSaved(updated);
    } else {
      setSaveState("dirty");
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  function exportMarkdown() {
    downloadObsidianNote(buildNote());
  }

  const savedLabel =
    saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft />
          </Button>
          <span className={cn("text-muted text-xs", saveState === "dirty" && "text-warning")}>
            {savedLabel}
          </span>
          {onPushToObsidian ? (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                obsidianConnected ? "text-success" : "text-muted",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {obsidianConnected ? "Obsidian" : "Offline"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(note)}
            aria-label={note.favorite ? "Unfavorite" : "Favorite"}
          >
            <Star className={cn("size-4", note.favorite && "text-accent fill-current")} />
          </Button>
          {onPushToObsidian ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onPushToObsidian(buildNote())}
              aria-label="Save to Obsidian"
            >
              <UploadCloud />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={exportMarkdown}
            aria-label="Export to Obsidian (.md)"
          >
            <Download />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted hover:text-danger"
            onClick={() => onDelete(note.id)}
            aria-label="Delete note"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            update("title", e.target.value);
          }}
          placeholder="Note title"
          className="border-none bg-transparent px-0 text-xl font-semibold focus-visible:border-none"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="note-folder">Folder</Label>
            <Input
              id="note-folder"
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value);
                update("folder", e.target.value);
              }}
              placeholder="Unfiled"
              list="note-folders"
            />
            <datalist id="note-folders">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="note-tags">Tags</Label>
            <Input
              id="note-tags"
              value={tagsText}
              onChange={(e) => {
                setTagsText(e.target.value);
                update("tagsText", e.target.value);
              }}
              placeholder="study, work"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { id: "write", label: "Write", icon: <PenLine /> },
              { id: "preview", label: "Preview", icon: <Eye /> },
              { id: "split", label: "Split", icon: <Columns2 /> },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setView(m.id)}
              className={cn(
                "text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                view === m.id && "bg-surface-2 text-foreground font-medium",
              )}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          ))}
        </div>

        <div className={cn("grid gap-4", view === "split" && "lg:grid-cols-2")}>
          {view !== "preview" ? (
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                update("content", e.target.value);
              }}
              placeholder="Write in Markdown — code blocks, lists, tables…"
              className="min-h-[55vh] resize-none font-mono text-sm"
              spellCheck={false}
            />
          ) : null}
          {view !== "write" ? (
            <div className="border-border bg-surface rounded-lg border p-4">
              <MarkdownPreview
                content={content || "*Nothing to preview yet.*"}
                notes={notes}
                onNavigate={onNavigate}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
