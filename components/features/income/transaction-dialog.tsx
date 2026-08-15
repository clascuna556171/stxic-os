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
import type { Currency, Transaction, TransactionType } from "@/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/finance";
import { toISODate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const CURRENCIES: Currency[] = ["PHP", "USD", "EUR", "JPY"];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Transaction;
  defaultCurrency: Currency;
  defaultDate?: string;
  categories: string[];
  onSave: (entry: Transaction) => Promise<void>;
}

export function TransactionDialog({
  open,
  onOpenChange,
  initial,
  defaultCurrency,
  defaultDate = "",
  categories,
  onSave,
}: TransactionDialogProps) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "income");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? defaultCurrency);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [date, setDate] = useState(initial ? toISODate(initial.date) : defaultDate);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const baseCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const allCategories = [...new Set([...baseCategories, ...categories])].sort();

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
    const entry: Transaction = {
      id: initial?.id ?? crypto.randomUUID(),
      type,
      label: label.trim(),
      amount: Math.round(value * 100) / 100,
      currency,
      category: category.trim() || (type === "income" ? "Other" : "Other"),
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
          <DialogTitle>{initial ? "Edit entry" : "Add transaction"}</DialogTitle>
          <DialogDescription>Track income or expenses, in any supported currency.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="bg-surface-2 flex items-center gap-1 rounded-lg p-1">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setCategory("");
                }}
                className={cn(
                  "h-8 flex-1 rounded-md text-sm font-medium capitalize transition-colors",
                  type === t
                    ? t === "income"
                      ? "bg-success text-white"
                      : "bg-danger text-white"
                    : "text-muted hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="tx-label">Label</Label>
            <Input
              id="tx-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="July allowance"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
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
              <Label htmlFor="tx-category">Category</Label>
              <Input
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={type === "income" ? "Salary" : "Food"}
                list="tx-categories"
              />
              <datalist id="tx-categories">
                {allCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
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
