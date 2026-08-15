/**
 * Minimal RFC 5545 parser for the UM Blackboard iCal feed. Hand-rolled
 * (zero deps) because the feed's VTIMEZONE uses non-standard proleptic names
 * that trip up generic parsers — and the project already hand-rolls its RSS
 * parser. Covers the subset Blackboard emits: VEVENT with UID, SUMMARY,
 * DESCRIPTION, DTSTART/DTEND (TZID=Asia/Manila). See docs/AGENT_BADS_DE.md.
 */

import type { BlackboardEvent } from "@/types";

const TZ_OFFSET_MIN: Record<string, number> = {
  "Asia/Manila": 480, // UTC+8, no DST
  "Etc/UTC": 0,
  UTC: 0,
};

/** Unfold RFC 5545 folded lines (continuations start with a space or tab). */
export function unfoldIcal(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

/** Unescape RFC 5545 text (\, \; \n \N \\). */
export function unescapeIcalText(value: string): string {
  return value
    .replace(/\\n|\\N/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseProperty(line: string): Property | null {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const parts = left.split(";");
  const name = (parts[0] ?? "").toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name, params, value };
}

/** Parse an iCal date-time value (wall clock) into epoch ms (UTC). */
export function parseDateTime(value: string, params: Record<string, string> = {}): number {
  const tzid = params["TZID"];
  const offsetMin = tzid ? (TZ_OFFSET_MIN[tzid] ?? 0) : 0;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?Z?$/);
  if (!m) return 0;
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  return utc - offsetMin * 60_000;
}

/** Parse a VCALENDAR string into BlackboardEvents. */
export function parseIcal(text: string): BlackboardEvent[] {
  const unfolded = unfoldIcal(text);
  const events: BlackboardEvent[] = [];

  for (const block of unfolded.split(/BEGIN:VEVENT/i).slice(1)) {
    const end = block.split(/END:VEVENT/i)[0];
    if (!end) continue;

    const props: Record<string, Property> = {};
    for (const line of end.split("\n")) {
      const p = parseProperty(line);
      if (p) props[p.name] = p;
    }

    const uid = props["UID"]?.value;
    const summary = props["SUMMARY"]?.value;
    if (!uid || !summary) continue;

    const dtstart = props["DTSTART"];
    const dtend = props["DTEND"];
    events.push({
      uid,
      summary: unescapeIcalText(summary),
      description: props["DESCRIPTION"]
        ? unescapeIcalText(props["DESCRIPTION"].value).trim()
        : undefined,
      dtstart: dtstart ? parseDateTime(dtstart.value, dtstart.params) : 0,
      dtend: dtend ? parseDateTime(dtend.value, dtend.params) : 0,
    });
  }

  return events;
}
