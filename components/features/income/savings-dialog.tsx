"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Currency, SavingsGoal } from "@/types";
import { toISODate } from "@/lib/utils/dates";

const CURRENCIES: Currency[] = ["PHP", "USD", "EUR", "JPY"];

interface SavingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SavingsGoal;
  defaultCurrency: Currency;
  onSave: (goal: SavingsGoal) => Promise<void>;
}

export function SavingsDialog({
  open,
  onOpenChange,
  initial,
  defaultCurrency,
  onSave,
}: SavingsDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? String(initial.target) : "");
  const [saved, setSaved] = useState(initial ? String(initial.saved) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? defaultCurrency);
  const [deadline, setDeadline] = useState(initial?.deadline ? toISODate(initial.deadline) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const targetValue = Number(target);
    const savedValue = Number(saved) || 0;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError("Enter a valid target amount.");
      return;
    }
    if (!Number.isFinite(savedValue) || savedValue < 0) {
      setError("Enter a valid saved amount.");
      return;
    }
    const now = Date.now();
    const deadlineTs = deadline ? new Date(deadline).getTime() : undefined;
    const goal: SavingsGoal = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      target: Math.round(targetValue * 100) / 100,
      saved: Math.round(savedValue * 100) / 100,
      currency,
      deadline: deadlineTs,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    try {
      await onSave(goal);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>Set a target and track your progress toward it.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="sav-name">Name</Label>
            <Input
              id="sav-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sav-target">Target</Label>
              <Input
                id="sav-target"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="sav-saved">Saved so far</Label>
              <Input
                id="sav-saved"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sav-deadline">Deadline (optional)</Label>
              <Input
                id="sav-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="text-danger text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : initial ? "Save changes" : "Create goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
