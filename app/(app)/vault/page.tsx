"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { VaultItemDialog } from "@/components/features/vault/vault-item-dialog";
import { PasswordGenerator } from "@/components/features/vault/password-generator";
import { passwordStrength } from "@/lib/strength";
import { reusedPasswordIds, vaultFolders, vaultTags } from "@/lib/vault";
import { deleteVaultItem, listVault, saveVaultItem } from "@/lib/hydrate";
import { cn } from "@/lib/utils/cn";
import type { VaultItem } from "@/types";

function CardStrength({ value }: { value: string }) {
  const { score } = passwordStrength(value);
  const color = score <= 1 ? "bg-danger" : score === 2 ? "bg-warning" : "bg-success";
  return (
    <div className="flex gap-1" aria-label={`Strength ${score}/4`}>
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className={cn("h-1 w-4 rounded-full", s <= score ? color : "bg-surface-2")} />
      ))}
    </div>
  );
}

export default function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VaultItem | undefined>(undefined);
  const [dialogKey, setDialogKey] = useState(0);
  const [deleting, setDeleting] = useState<VaultItem | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorKey, setGeneratorKey] = useState(0);

  function openNew() {
    setEditing(undefined);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(item: VaultItem) {
    setEditing(item);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function refresh() {
    const res = await listVault();
    if (res.ok) {
      setItems(res.data);
      setError("");
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listVault();
      if (cancelled) return;
      if (res.ok) {
        setItems(res.data);
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

  const folders = useMemo(() => vaultFolders(items), [items]);
  const tags = useMemo(() => vaultTags(items), [items]);
  const [reusedIds, setReusedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    void reusedPasswordIds(items).then(setReusedIds);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (folder === "favorites" && !it.favorite) return false;
      if (folder !== "all" && folder !== "favorites" && it.folder !== folder) return false;
      if (activeTag && !it.tags.includes(activeTag)) return false;
      if (q && !`${it.name} ${it.username} ${it.url ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, folder, activeTag]);

  async function onSave(item: VaultItem) {
    const res = await saveVaultItem(item);
    if (res.ok) {
      await refresh();
      toast({ title: "Saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await deleteVaultItem(deleting.id);
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deleting.id));
      toast({ title: "Deleted" });
    } else {
      toast({ title: "Delete failed", description: res.error, variant: "danger" });
    }
    setDeleting(null);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "danger" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Vault</h2>
          <p className="text-muted text-sm">
            {items.length} item{items.length === 1 ? "" : "s"} · encrypted at rest
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setGeneratorKey((k) => k + 1);
              setGeneratorOpen(true);
            }}
          >
            <Sparkles />
            Generate
          </Button>
          <Button variant="primary" onClick={openNew}>
            <Plus />
            New item
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vault…"
            className="pl-9"
            aria-label="Search vault"
          />
        </div>
        <Select value={folder} onValueChange={setFolder}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            <SelectItem value="favorites">Favorites</SelectItem>
            {folders.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag((t) => (t === tag ? null : tag))}
              className={cn(
                "border-border bg-surface text-muted hover:text-foreground rounded-full border px-3 py-1 text-xs transition-colors",
                activeTag === tag && "border-accent bg-surface-2 text-foreground",
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<KeyRound />} title="Couldn't load your vault" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<KeyRound />}
          title={items.length === 0 ? "No passwords yet" : "No matches"}
          description={
            items.length === 0
              ? "Add your first login to get started."
              : "Try a different search, folder, or tag."
          }
          action={
            items.length === 0 ? (
              <Button variant="primary" onClick={openNew}>
                <Plus />
                Add your first item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="border-border bg-surface hover:bg-surface-2/50 flex flex-col gap-3 rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-medium">{item.name}</p>
                  <p className="text-muted truncate text-xs">{item.username || "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onSave({ ...item, favorite: !item.favorite })}
                  aria-label={item.favorite ? "Unfavorite" : "Favorite"}
                  className={cn(
                    "text-muted hover:text-foreground shrink-0 rounded-md p-1 transition-colors",
                    item.favorite && "text-accent",
                  )}
                >
                  <Star className={cn("size-4", item.favorite && "fill-current")} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {item.folder ? <Badge variant="muted">{item.folder}</Badge> : null}
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    #{tag}
                  </Badge>
                ))}
                {reusedIds.has(item.id) ? (
                  <Badge variant="warning">
                    <ShieldAlert className="size-3" />
                    Reused
                  </Badge>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2">
                <CardStrength value={item.password} />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => void copy(item.password, "Password")}
                    aria-label="Copy password"
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => openEdit(item)}
                    aria-label="Edit"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted hover:text-danger size-8"
                    onClick={() => setDeleting(item)}
                    aria-label="Delete"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VaultItemDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        folders={folders}
        onSave={onSave}
      />

      <PasswordGenerator key={generatorKey} open={generatorOpen} onOpenChange={setGeneratorOpen} />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the item. This cannot be undone.
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
