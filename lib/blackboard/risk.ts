/**
 * BADS-DE risk scoring — pure and unit-tested. Score 0–3 mapped to a pill.
 * See docs/AGENT_BADS_DE.md.
 */

import type { BlackboardEvent } from "@/types";

export type RiskLevel = "Low" | "Med" | "High" | "Critical";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 0–3: +2 overdue, +1 due within 3 days, +1 missing description.
 */
export function riskScore(
  event: Pick<BlackboardEvent, "dtstart" | "description">,
  now: number,
): number {
  let score = 0;
  if (event.dtstart < now) score += 2;
  else if (event.dtstart - now <= 3 * DAY_MS) score += 1;
  if (!event.description || event.description.trim().length === 0) score += 1;
  return Math.min(score, 3);
}

export function riskLabel(score: number): RiskLevel {
  if (score <= 0) return "Low";
  if (score === 1) return "Med";
  if (score === 2) return "High";
  return "Critical";
}
