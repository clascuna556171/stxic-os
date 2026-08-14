/** Date formatting helpers (UTC-aware, locale-friendly). */

const dayMs = 24 * 60 * 60 * 1000;

export function formatDate(
  ts: number | string | Date,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat(undefined, opts).format(toDate(ts));
}

export function formatTime(
  ts: number | string | Date,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  return new Intl.DateTimeFormat(undefined, opts).format(toDate(ts));
}

/** ISO date key for habit logs / grouping: YYYY-MM-DD (local). */
export function toISODate(ts: number | string | Date): string {
  const d = toDate(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/** Compact relative time: "just now", "5m", "2h", "3d". */
export function relativeTime(ts: number | string | Date, now = Date.now()): string {
  const diff = now - toDate(ts).getTime();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m`;
  if (abs < dayMs) return `${Math.round(abs / 3_600_000)}h`;
  if (abs < 30 * dayMs) return `${Math.round(abs / dayMs)}d`;
  return formatDate(ts);
}

export function startOfDay(ts: number | string | Date): number {
  const d = toDate(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number | string | Date, days: number): number {
  return toDate(ts).getTime() + days * dayMs;
}

function toDate(ts: number | string | Date): Date {
  if (ts instanceof Date) return ts;
  return new Date(ts);
}
