"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { exportBackup, downloadBackup } from "@/lib/backup/export";
import { previewRestore, restoreBackup, type RestoreCounts } from "@/lib/backup/restore";
import { formatDate } from "@/lib/utils/dates";

const LAST_BACKUP_KEY = "stxic:lastBackup";

function readLastBackup(): number | null {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function BackupCard({ disabled = false }: { disabled?: boolean }) {
  const [lastBackup, setLastBackup] = useState<number | null>(readLastBackup());
  const [password, setPassword] = useState("");
  const [dialog, setDialog] = useState<"export" | "restore" | "confirm" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [restoreText, setRestoreText] = useState("");
  const [preview, setPreview] = useState<RestoreCounts | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  function openDialog(mode: "export" | "restore") {
    setPassword("");
    setError("");
    setDialog(mode);
  }

  async function onPickFile(file: File) {
    setError("");
    const text = await file.text();
    setRestoreText(text);
    openDialog("restore");
  }

  async function submitPassword() {
    if (!password) {
      setError("Enter your master password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (dialog === "export") {
        const blob = await exportBackup(password);
        downloadBackup(blob, `stxic-${new Date().toISOString().slice(0, 10)}.stxbak`);
        localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
        setLastBackup(Date.now());
        setDialog(null);
        toast({
          title: "Backup exported",
          description: "Keep the .stxbak file somewhere safe.",
          variant: "success",
        });
      } else if (dialog === "restore") {
        const result = await previewRestore(password, restoreText);
        setPreview(result.counts);
        setDialog("confirm");
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmRestore() {
    setBusy(true);
    setError("");
    const result = await restoreBackup(password, restoreText);
    setBusy(false);
    if (result.ok) {
      setDialog(null);
      setPassword("");
      toast({
        title: "Backup restored",
        description: `${result.counts.notes} notes, ${result.counts.tasks} tasks, ${result.counts.transactions} transactions.`,
        variant: "success",
      });
    } else {
      setError(result.error ?? "Restore failed");
    }
  }

  function resetRestore() {
    setDialog(null);
    setPassword("");
    setRestoreText("");
    setPreview(null);
    setError("");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Backup</CardTitle>
            <CardDescription>
              Encrypted `.stxbak` export &amp; restore — sealed with your master password.
            </CardDescription>
          </div>
          {lastBackup ? <Badge variant="muted">Last backup {formatDate(lastBackup)}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => openDialog("export")} disabled={disabled}>
          <Download />
          Export .stxbak
        </Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()} disabled={disabled}>
          <Upload />
          Restore
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".stxbak,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPickFile(file);
            e.target.value = "";
          }}
        />
        {disabled ? (
          <p className="text-muted w-full text-xs">Backups are unavailable in demo mode.</p>
        ) : null}
      </CardContent>

      <Dialog
        open={dialog === "export" || dialog === "restore"}
        onOpenChange={(o) => !o && resetRestore()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "export" ? "Export backup" : "Restore backup"}</DialogTitle>
            <DialogDescription>
              Enter your master password to {dialog === "export" ? "seal" : "decrypt"} the backup.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="backup-password">Master password</Label>
            <Input
              id="backup-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error ? <p className="text-danger text-sm">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={resetRestore}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submitPassword()} disabled={busy}>
              {busy ? "Working…" : dialog === "export" ? "Export" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "confirm"} onOpenChange={(o) => !o && resetRestore()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm restore</DialogTitle>
            <DialogDescription>
              This will upsert the following items into your vault:
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <ul className="text-muted grid grid-cols-2 gap-1 text-sm">
              <li>Vault items: {preview.vault}</li>
              <li>Notes: {preview.notes}</li>
              <li>Tasks: {preview.tasks}</li>
              <li>Transactions: {preview.transactions}</li>
              <li>Accounts: {preview.accounts}</li>
              <li>Savings goals: {preview.savingsGoals}</li>
              <li>Habits: {preview.habits}</li>
              <li>Focus sessions: {preview.focusSessions}</li>
            </ul>
          ) : null}
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={resetRestore}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void confirmRestore()} disabled={busy}>
              {busy ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
