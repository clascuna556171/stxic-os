"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CircleDollarSign, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { IncomeEntryDialog } from "@/components/features/income/income-entry-dialog";
import { FxConverter } from "@/components/features/fx/fx-converter";
import { getSettings, deleteIncomeEntry, listIncome, saveIncomeEntry } from "@/lib/hydrate";
import { groupByMonth, incomeToCsv, monthKey, monthlyTotals } from "@/lib/income";
import { downloadCsv, toCsv } from "@/lib/utils/csv";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate, toISODate } from "@/lib/utils/dates";
import type { Currency, IncomeEntry } from "@/types";

const IncomeChart = dynamic(
  () => import("@/components/features/income/income-chart").then((m) => m.IncomeChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

function totalsByCurrency(entries: IncomeEntry[]): Map<Currency, number> {
  const map = new Map<Currency, number>();
  for (const e of entries) map.set(e.currency, (map.get(e.currency) ?? 0) + e.amount);
  return map;
}

function currencyTotalText(map: Map<Currency, number>): string {
  if (map.size === 0) return formatCurrency(0, "PHP");
  return [...map.entries()].map(([c, v]) => formatCurrency(v, c)).join(" · ");
}

export default function IncomePage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>("PHP");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | undefined>();
  const [dialogKey, setDialogKey] = useState(0);
  const [deleting, setDeleting] = useState<IncomeEntry | null>(null);
  const [defaultDate, setDefaultDate] = useState("");
  const [thisMonthKey, setThisMonthKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [listRes, settingsRes] = await Promise.all([listIncome(), getSettings()]);
      if (cancelled) return;
      setThisMonthKey(monthKey(Date.now()));
      if (listRes.ok) {
        setEntries(listRes.data);
        setError("");
      } else {
        setError(listRes.error);
      }
      if (settingsRes.ok) setDefaultCurrency(settingsRes.data.defaultCurrency);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthly = useMemo(() => monthlyTotals(entries), [entries]);
  const groups = useMemo(() => groupByMonth(entries), [entries]);
  const categories = useMemo(() => [...new Set(entries.map((e) => e.category))], [entries]);

  const thisMonthTotal = totalsByCurrency(entries.filter((e) => monthKey(e.date) === thisMonthKey));
  const allTimeTotal = totalsByCurrency(entries);

  function openNew() {
    setEditing(undefined);
    setDefaultDate(toISODate(Date.now()));
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(entry: IncomeEntry) {
    setEditing(entry);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function onSave(entry: IncomeEntry) {
    const res = await saveIncomeEntry(entry);
    if (res.ok) {
      setEntries((prev) =>
        prev.some((e) => e.id === entry.id)
          ? prev.map((e) => (e.id === entry.id ? entry : e))
          : [...prev, entry],
      );
      toast({ title: "Saved", variant: "success" });
    } else {
      toast({ title: "Save failed", description: res.error, variant: "danger" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const res = await deleteIncomeEntry(deleting.id);
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== deleting.id));
      toast({ title: "Deleted" });
    } else {
      toast({ title: "Delete failed", description: res.error, variant: "danger" });
    }
    setDeleting(null);
  }

  function exportCsv() {
    if (entries.length === 0) return;
    const rows = incomeToCsv(entries);
    downloadCsv("stxic-income", toCsv(rows));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Income</h2>
          <p className="text-muted text-sm">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"} · multi-currency
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv} disabled={entries.length === 0}>
            <Download />
            Export CSV
          </Button>
          <Button variant="primary" onClick={openNew}>
            <Plus />
            Add income
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-lg font-semibold">
            {currencyTotalText(thisMonthTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All time</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-lg font-semibold">
            {currencyTotalText(allTimeTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-lg font-semibold">{categories.length}</CardContent>
        </Card>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : error ? (
        <EmptyState icon={<CircleDollarSign />} title="Couldn't load income" description={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<CircleDollarSign />}
          title="No income yet"
          description="Add your first entry to see monthly totals and a chart."
          action={
            <Button variant="primary" onClick={openNew}>
              <Plus />
              Add income
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_20rem]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Monthly totals</CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeChart data={monthly} currency={defaultCurrency} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Convert</CardTitle>
              </CardHeader>
              <CardContent>
                <FxConverter />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <Card key={g.key}>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle>{g.label}</CardTitle>
                  <Badge variant="muted">{currencyTotalText(totalsByCurrency(g.entries))}</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {g.entries.map((e) => (
                    <div
                      key={e.id}
                      className="hover:bg-surface-2/50 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="min-w-0">
                          <p className="text-foreground truncate text-sm font-medium">{e.label}</p>
                          <p className="text-muted text-xs">
                            {e.category} · {formatDate(e.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-sm">
                          {formatCurrency(e.amount, e.currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(e)}
                          aria-label="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted hover:text-danger size-8"
                          onClick={() => setDeleting(e)}
                          aria-label="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <IncomeEntryDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultCurrency={defaultCurrency}
        defaultDate={defaultDate}
        categories={categories}
        onSave={onSave}
      />

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.label}”?</DialogTitle>
            <DialogDescription>This permanently removes the entry.</DialogDescription>
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
