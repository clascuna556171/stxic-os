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
import type { Currency, IncomeEntry } from "@/types";
import { INCOME_CATEGORIES } from "@/lib/income";
import { toISODate } from "@/lib/utils/dates";

const CURRENCIES: Currency[] = ["PHP", "USD", "EUR", "JPY"];

interface IncomeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: IncomeEntry;
  defaultCurrency: Currency;
  defaultDate?: string;
  categories: string[];
  onSave: (entry: IncomeEntry) => Promise<void>;
}

export function IncomeEntryDialog({
  open,
  onOpenChange,
  initial,
  defaultCurrency,
  defaultDate = "",
  categories,
  onSave,
}: IncomeEntryDialogProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? defaultCurrency);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [date, setDate] = useState(initial ? toISODate(initial.date) : defaultDate);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const allCategories = [...new Set([...INCOME_CATEGORIES, ...categories])].sort();

  async function submit() {
    const value = Number(amount);
    if (!label.trim()) {
      setError("Label is required.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid amount.");
      return;
    }
    const [y, m, d] = date.split("-").map(Number);
    const now = Date.now();
    const entry: IncomeEntry = {
      id: initial?.id ?? crypto.randomUUID(),
      label: label.trim(),
      amount: Math.round(value * 100) / 100,
      currency,
      category: category.trim() || "Other",
      date: new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    try {
      await onSave(entry);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit entry" : "Add income"}</DialogTitle>
          <DialogDescription>Track what you earn, in any supported currency.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="inc-label">Label</Label>
            <Input
              id="inc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="July allowance"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inc-amount">Amount</Label>
              <Input
                id="inc-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="inc-category">Category</Label>
              <Input
                id="inc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Salary"
                list="inc-categories"
              />
              <datalist id="inc-categories">
                {allCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="inc-date">Date</Label>
              <Input
                id="inc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
            {busy ? "Saving…" : initial ? "Save changes" : "Add entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
