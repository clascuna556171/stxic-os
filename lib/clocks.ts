/**
 * World clocks helpers — timezone metadata, UTC offset, labels.
 * Pure (no Firestore) and unit-tested where deterministic.
 */

const KNOWN_LABELS: Record<string, string> = {
  "Asia/Manila": "Manila",
  UTC: "UTC",
  "America/Los_Angeles": "Los Angeles",
  "America/New_York": "New York",
  "America/Chicago": "Chicago",
  "America/Toronto": "Toronto",
  "Europe/London": "London",
  "Europe/Berlin": "Berlin",
  "Europe/Paris": "Paris",
  "Asia/Tokyo": "Tokyo",
  "Asia/Singapore": "Singapore",
  "Asia/Dubai": "Dubai",
  "Asia/Seoul": "Seoul",
  "Australia/Sydney": "Sydney",
  "Pacific/Auckland": "Auckland",
};

/** Curated zones offered in the add-clock picker. */
export const AVAILABLE_ZONES: string[] = Object.keys(KNOWN_LABELS);

/** Zones shown by default before the user customizes. */
export const DEFAULT_CLOCKS: string[] = [
  "Asia/Manila",
  "UTC",
  "America/Los_Angeles",
  "Europe/Berlin",
];

/** Friendly label for a zone (fallback: last path segment, underscores → spaces). */
export function timeZoneLabel(id: string): string {
  return KNOWN_LABELS[id] ?? id.replace(/_/g, " ").replace(/^.*\//, "");
}

/** UTC offset in minutes for a zone at a given instant. */
export function timeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** "+08:00" / "-05:00" / "+00:00" from offset minutes. */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `${sign}${h}:${m}`;
}
