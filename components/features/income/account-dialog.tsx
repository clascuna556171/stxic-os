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
import type { AccountKind, Currency, FinanceAccount } from "@/types";

const CURRENCIES: Currency[] = ["PHP", "USD", "EUR", "JPY"];
const KINDS: Array<{ value: AccountKind; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "debit", label: "Debit card" },
  { value: "credit", label: "Credit card" },
  { value: "e-wallet", label: "E-wallet" },
  { value: "savings", label: "Savings" },
  { value: "other", label: "Other" },
];

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: FinanceAccount;
  defaultCurrency: Currency;
  onSave: (account: FinanceAccount) => Promise<void>;
}

export function AccountDialog({
  open,
  onOpenChange,
  initial,
  defaultCurrency,
  onSave,
}: AccountDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? "cash");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? defaultCurrency);
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "");
  const [last4, setLast4] = useState(initial?.last4 ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = Number(balance);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!Number.isFinite(value)) {
      setError("Enter a valid balance.");
      return;
    }
    const now = Date.now();
    const account: FinanceAccount = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      kind,
      currency,
      balance: Math.round(value * 100) / 100,
      last4: last4.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    setBusy(true);
    try {
      await onSave(account);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            Track a card or bank manually — balance is whatever you set it to.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GCash"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as AccountKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div>
            <Label htmlFor="acc-balance">Balance</Label>
            <Input
              id="acc-balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="acc-last4">Last 4 digits (optional)</Label>
              <Input
                id="acc-last4"
                value={last4}
                onChange={(e) => setLast4(e.target.value)}
                placeholder="4829"
                maxLength={4}
              />
            </div>
            <div>
              <Label htmlFor="acc-notes">Notes (optional)</Label>
              <Input
                id="acc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Main spending card"
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
            {busy ? "Saving…" : initial ? "Save changes" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
