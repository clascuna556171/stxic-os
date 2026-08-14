"use client";

import { useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordStrength } from "@/components/features/vault/password-strength";
import { PasswordGenerator } from "@/components/features/vault/password-generator";
import type { VaultItem } from "@/types";

interface VaultItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provide an existing item to edit, or omit for a new item. */
  initial?: VaultItem;
  folders: string[];
  onSave: (item: VaultItem) => Promise<void>;
}

const EMPTY = {
  name: "",
  username: "",
  password: "",
  url: "",
  folder: "",
  tags: "",
  notes: "",
  favorite: false,
};

export function VaultItemDialog({
  open,
  onOpenChange,
  initial,
  folders,
  onSave,
}: VaultItemDialogProps) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          username: initial.username,
          password: initial.password,
          url: initial.url ?? "",
          folder: initial.folder,
          tags: initial.tags.join(", "),
          notes: initial.notes ?? "",
          favorite: initial.favorite,
        }
      : EMPTY,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorKey, setGeneratorKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "password") setError("");
  }

  async function submit() {
    const name = form.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!form.password) {
      setError("Password is required.");
      return;
    }
    const now = Date.now();
    const item: VaultItem = {
      id: initial?.id ?? crypto.randomUUID(),
      name,
      username: form.username.trim(),
      password: form.password,
      url: form.url.trim() || undefined,
      folder: form.folder.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: form.notes.trim() || undefined,
      favorite: form.favorite,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    try {
      await onSave(item);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            Stored encrypted with your master key. Nothing leaves your device unencrypted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="vi-name">Name</Label>
            <Input
              id="vi-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="GitHub"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="vi-username">Username / email</Label>
            <Input
              id="vi-username"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <Label htmlFor="vi-password">Password</Label>
            <div className="flex gap-2">
              <Input
                id="vi-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
                className="font-mono"
              />
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => {
                  setGeneratorKey((k) => k + 1);
                  setGeneratorOpen(true);
                }}
                aria-label="Generate password"
              >
                <Sparkles />
              </Button>
            </div>
            <PasswordStrength value={form.password} className="mt-2" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="vi-url">URL</Label>
              <Input
                id="vi-url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://github.com"
                inputMode="url"
              />
            </div>
            <div>
              <Label htmlFor="vi-folder">Folder</Label>
              <Input
                id="vi-folder"
                value={form.folder}
                onChange={(e) => set("folder", e.target.value)}
                placeholder="Personal"
                list="vi-folders"
              />
              <datalist id="vi-folders">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <Label htmlFor="vi-tags">Tags</Label>
            <Input
              id="vi-tags"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="dev, work, finance"
            />
          </div>

          <div>
            <Label htmlFor="vi-notes">Notes</Label>
            <Textarea
              id="vi-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes (recovery codes, hints…)"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="vi-favorite" className="mb-0">
              Favorite
            </Label>
            <Switch
              id="vi-favorite"
              checked={form.favorite}
              onCheckedChange={(on) => set("favorite", on)}
            />
          </div>

          {error ? <p className="text-danger text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : initial ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <PasswordGenerator
        key={generatorKey}
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        onUse={(pwd) => set("password", pwd)}
      />
    </Dialog>
  );
}
