"use client";

import { useEffect, useState } from "react";
import { ArrowDownUp, RefreshCw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FX_CURRENCIES, getFxRate } from "@/lib/fx";
import { formatCurrency } from "@/lib/utils/currency";
import { relativeTime } from "@/lib/utils/dates";
import type { Currency } from "@/types";

export function FxConverter() {
  const [amount, setAmount] = useState("100");
  const [base, setBase] = useState<Currency>("USD");
  const [quote, setQuote] = useState<Currency>("PHP");
  const [rate, setRate] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getFxRate(base, quote);
      if (cancelled) return;
      if (res.ok) {
        setRate(res.data.rate);
        setFetchedAt(res.data.fetchedAt);
        setStale(res.data.stale);
        setError("");
      } else {
        setError(res.error);
        setRate(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [base, quote]);

  function swap() {
    const prev = base;
    setBase(quote);
    setQuote(prev);
    setLoading(true);
  }

  async function refresh() {
    setLoading(true);
    const res = await getFxRate(base, quote);
    if (res.ok) {
      setRate(res.data.rate);
      setFetchedAt(res.data.fetchedAt);
      setStale(res.data.stale);
      setError("");
    } else {
      setError(res.error);
      setRate(null);
    }
    setLoading(false);
  }

  const value = Number(amount);
  const converted = rate != null && Number.isFinite(value) ? value * rate : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div>
          <Label htmlFor="fx-base">From</Label>
          <Select value={base} onValueChange={(v) => setBase(v as Currency)}>
            <SelectTrigger id="fx-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FX_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={swap}
          aria-label="Swap currencies"
          className="mb-0.5"
        >
          <ArrowDownUp />
        </Button>
        <div>
          <Label htmlFor="fx-quote">To</Label>
          <Select value={quote} onValueChange={(v) => setQuote(v as Currency)}>
            <SelectTrigger id="fx-quote">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FX_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="fx-amount">Amount</Label>
        <Input
          id="fx-amount"
          type="number"
          inputMode="decimal"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="border-border bg-surface-2 flex items-center justify-between rounded-lg border px-4 py-3">
        {loading ? (
          <Skeleton className="h-6 w-32" />
        ) : error ? (
          <span className="text-danger text-sm">{error}</span>
        ) : converted != null ? (
          <span className="text-foreground font-mono text-lg font-semibold">
            {formatCurrency(converted, quote)}
          </span>
        ) : (
          <span className="text-muted text-sm">—</span>
        )}
        <div className="flex items-center gap-2">
          {stale ? <Badge variant="warning">Stale</Badge> : null}
          <Button variant="ghost" size="icon" onClick={refresh} aria-label="Refresh rate">
            <RefreshCw />
          </Button>
        </div>
      </div>

      {rate != null && fetchedAt != null && !loading ? (
        <p className="text-muted text-xs">
          1 {base} = {rate.toFixed(4)} {quote} · updated {relativeTime(fetchedAt)}
        </p>
      ) : null}
    </div>
  );
}
