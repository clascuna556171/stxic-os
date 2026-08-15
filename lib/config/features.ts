/**
 * Stxic feature flags — single source of truth for what's live.
 *
 * Core v1 surfaces default to `true`; v1.5 extras are flag-gated and hidden
 * from nav until their agent ships them. See docs/AGENT_API_ORCHESTRATION.md.
 */

export const features = {
  // ── v1 Core ────────────────────────────────────────────────
  auth: true,
  vault: true,
  notes: true,
  tasks: true,
  income: true,
  clocks: true,
  fx: true,
  presets: true,
  focus: true,
  backup: true,
  demo: true,

  // ── v1.5 Extras (flag-gated) ───────────────────────────────
  news: true,
  habits: true,
  ai: true,
  studyPlanner: true,
  badsde: true,
  convert: true,
  obsidian: true,
  obsidianLive: true,
  semesterPlanner: true,
  dashboardGrid: true,
  readingList: true,
  ocr: true,

  // ── v2 (flag-gated) ─────────────────────────────────────────
  publish: true,
  biometric: false,
  push: false,
} as const;

export type FeatureKey = keyof typeof features;

export function isEnabled(key: FeatureKey): boolean {
  return features[key];
}
