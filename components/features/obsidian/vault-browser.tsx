"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Folder, RefreshCw, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { saveNote } from "@/lib/hydrate";
import { type DirectoryEntry } from "@/lib/obsidian/client";
import { buildNoteFromImport } from "@/lib/obsidian/format";
import { planPull, type PullPlan } from "@/lib/obsidian/sync";
import type { ObsidianBridge } from "./use-obsidian-bridge";
import { cn } from "@/lib/utils/cn";
import type { Note } from "@/types";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
}

interface VaultBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bridge: ObsidianBridge;
  notes: Note[];
  onNotesChanged: (notes: Note[]) => void;
  activeNote: Note | null;
  onOpenNote: (id: string) => void;
}

function buildNode(dirPath: string, entry: DirectoryEntry): TreeNode {
  const isDir = entry.filename.endsWith("/");
  const name = isDir ? entry.filename.slice(0, -1) : entry.filename;
  const path = dirPath ? `${dirPath}/${name}` : name;
  return { name, path, isDir };
}

export function VaultBrowser({
  open,
  onOpenChange,
  bridge,
  notes,
  onNotesChanged,
  activeNote,
  onOpenNote,
}: VaultBrowserProps) {
  const [entries, setEntries] = useState<Record<string, TreeNode[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ path: string; plan: PullPlan } | null>(null);
  const [confirm, setConfirm] = useState<PullPlan | null>(null);
  const [busy, setBusy] = useState(false);

  const client = bridge.client;

  async function loadDir(path: string) {
    if (!client) return;
    const res = await client.listDirectory(path);
    if (res.ok) {
      setEntries((prev) => ({ ...prev, [path]: res.data.map((e) => buildNode(path, e)) }));
    } else {
      toast({
        title: "Couldn't list directory",
        description: res.error.message,
        variant: "danger",
      });
    }
  }

  useEffect(() => {
    if (!open || !client) return;
    void (async () => {
      setSelected(null);
      setConfirm(null);
      setExpanded(new Set());
      bridge.refresh();
      await loadDir("");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);

  async function toggleDir(node: TreeNode) {
    if (expanded.has(node.path)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(node.path));
    if (!entries[node.path]) await loadDir(node.path);
  }

  async function openFile(node: TreeNode) {
    if (!client) return;
    setBusy(true);
    const res = await client.readNote(node.path);
    setBusy(false);
    if (res.ok) {
      setSelected({ path: node.path, plan: planPull(node.path, res.data, notes) });
    } else {
      toast({ title: "Couldn't read note", description: res.error.message, variant: "danger" });
    }
  }

  async function applyPull(plan: PullPlan) {
    const existing = plan.existingId ? notes.find((n) => n.id === plan.existingId) : undefined;
    const note = buildNoteFromImport(
      {
        title: plan.title,
        content: plan.content,
        tags: plan.tags,
        folder: plan.folder,
        stxicId: plan.stxicId,
      },
      existing,
    );
    setBusy(true);
    const res = await saveNote(note);
    setBusy(false);
    if (res.ok) {
      const map = new Map(notes.map((n) => [n.id, n]));
      map.set(note.id, note);
      onNotesChanged([...map.values()]);
      toast({
        title: "Pulled from Obsidian",
        description: `Saved "${note.title}".`,
        variant: "success",
      });
      setConfirm(null);
      setSelected(null);
      onOpenNote(note.id);
    } else {
      toast({ title: "Pull failed", description: res.error, variant: "danger" });
    }
  }

  function requestPull() {
    if (!selected) return;
    if (selected.plan.kind === "update") setConfirm(selected.plan);
    else void applyPull(selected.plan);
  }

  async function pushActive() {
    if (!activeNote) return;
    setBusy(true);
    const res = await bridge.pushNote(activeNote);
    setBusy(false);
    if (res.ok) {
      toast({ title: "Saved to Obsidian", variant: "success" });
      setExpanded(new Set());
      await loadDir("");
    } else {
      toast({ title: "Push failed", description: res.error.message, variant: "danger" });
    }
  }

  function renderTree(path: string, depth: number): React.ReactNode {
    const children = entries[path] ?? [];
    return children.map((node) => (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => (node.isDir ? void toggleDir(node) : void openFile(node))}
          className={cn(
            "hover:bg-surface-2/60 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            selected?.path === node.path && "bg-surface-2",
          )}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {node.isDir ? (
            <>
              <ChevronRight
                className={cn(
                  "text-muted size-3.5 transition-transform",
                  expanded.has(node.path) && "rotate-90",
                )}
              />
              <Folder className="text-muted size-4" />
            </>
          ) : (
            <FileText className="text-muted size-4" />
          )}
          <span className="text-foreground truncate">{node.name}</span>
        </button>
        {node.isDir && expanded.has(node.path) ? renderTree(node.path, depth + 1) : null}
      </div>
    ));
  }

  const body = !bridge.config ? (
    <Skeleton className="h-32 w-full" />
  ) : !bridge.config.enabled ? (
    <EmptyState
      title="Obsidian is not enabled"
      description="Enable it and connect in Settings first."
      action={
        <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
          <Link href="/settings">Open Settings</Link>
        </Button>
      }
    />
  ) : (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="border-border bg-surface/40 min-h-64 rounded-lg border p-2">
        {busy ? <Skeleton className="h-40 w-full" /> : renderTree("", 0)}
      </div>
      <div className="min-h-64">
        {selected ? (
          <div className="flex h-full flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-foreground truncate text-sm font-medium">
                {selected.plan.title}
              </span>
              <Badge variant={selected.plan.kind === "update" ? "warning" : "muted"}>
                {selected.plan.kind === "new"
                  ? "New"
                  : selected.plan.kind === "unchanged"
                    ? "Up to date"
                    : "Changed"}
              </Badge>
            </div>
            <pre className="text-foreground border-border bg-surface flex-1 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap">
              {selected.plan.content || "(empty note)"}
            </pre>
            <Button
              variant="primary"
              size="sm"
              onClick={requestPull}
              disabled={selected.plan.kind === "unchanged" || busy}
            >
              <UploadCloud />
              {selected.plan.kind === "unchanged" ? "Up to date" : "Pull into Stxic"}
            </Button>
          </div>
        ) : (
          <p className="text-muted text-sm">Select a note to preview and pull it into Stxic.</p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex-row items-center justify-between">
          <div>
            <DialogTitle>Obsidian vault</DialogTitle>
            <DialogDescription>Browse your local vault and pull notes in.</DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            {bridge.connected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="danger">Offline</Badge>
            )}
            <Button variant="ghost" size="icon" aria-label="Refresh" onClick={bridge.refresh}>
              <RefreshCw className={cn("size-4", bridge.refreshing && "animate-spin")} />
            </Button>
          </div>
        </DialogHeader>

        {body}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => void pushActive()}
            disabled={!activeNote || busy}
          >
            <UploadCloud />
            Save current note to Obsidian
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pull “{confirm?.title}”?</DialogTitle>
            <DialogDescription>
              This overwrites your local note with the vault copy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-muted text-xs">Local</p>
              <p className="border-border bg-surface rounded-md border p-2 font-mono text-xs">
                {confirm?.localFirstLine || "(empty)"}
              </p>
            </div>
            <div>
              <p className="text-muted text-xs">Vault</p>
              <p className="border-border bg-surface rounded-md border p-2 font-mono text-xs">
                {confirm?.vaultFirstLine || "(empty)"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => confirm && void applyPull(confirm)}
              disabled={busy}
            >
              {busy ? "Pulling…" : "Pull"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
