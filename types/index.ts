/**
 * Stxic — shared domain types.
 *
 * Stable contract used by every agent. Do not change field names casually;
 * Firestore documents + the backup format depend on these. See
 * docs/AGENT_AUTH_DB.md for the collection layout.
 */

// ─────────────────────────────────────────────────────────────
// Common
// ─────────────────────────────────────────────────────────────

/** Consistent return envelope for every hydrate call + API route. */
export type Envelope<T> =
  { ok: true; data: T; error?: undefined } | { ok: false; data?: undefined; error: string };

/** Supported currencies (default PHP). */
export type Currency = "PHP" | "USD" | "EUR" | "JPY";

export type ThemeMode = "dark" | "light";

export type ThemePresetName = "stxc" | "mars" | "midnight" | "mono";

// ─────────────────────────────────────────────────────────────
// Auth / user
// ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: number;
  /** Salt used to derive the master-password KEK. */
  encKeySalt: string;
  /** Master-password-wrapped data encryption key (base64 iv.ciphertext). */
  wrappedDekMaster: string;
  /** True once the user has set their PIN. */
  hasPin: boolean;
  /** Reserved for the future optional paid tier. No payment logic now. */
  plan: "free";
}

// ─────────────────────────────────────────────────────────────
// Core collections (all ENCRYPTED at rest)
// ─────────────────────────────────────────────────────────────

export interface VaultItem {
  id: string;
  folder: string;
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "P0" | "P1" | "P2";
export type TaskType = "task" | "assignment";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: number;
  /** Google Calendar event id when mirrored via BADS-DE. */
  calendarEventId?: string;
  type: TaskType;
  createdAt: number;
  updatedAt: number;
}

export interface IncomeEntry {
  id: string;
  label: string;
  amount: number;
  currency: Currency;
  category: string;
  date: number;
  createdAt: number;
  updatedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  streak: number;
  /** ISO date (YYYY-MM-DD) → completed. */
  log: Record<string, boolean>;
  createdAt: number;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  start: number;
  duration: number; // seconds
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────

export interface ObsidianSettings {
  enabled: boolean;
  baseUrl: string;
  /** Allow the insecure HTTP fallback (port 27123). */
  insecure: boolean;
  /** AES-GCM encrypted API key (never stored plain). */
  encryptedKey: string;
  mcpUrl: string;
  lastConnectedAt?: number;
}

export interface UserSettings {
  themePreset: ThemePresetName;
  accent: string;
  theme: ThemeMode;
  /** Auto-lock minutes, 1–60, default 5. */
  autoLockMin: number;
  defaultCurrency: Currency;
  /** IANA timezone ids pinned to the dashboard world-clocks widget. */
  clocks?: string[];
  /**
   * Demo-mode only: the raw (exported) data-encryption key for an anonymous
   * guest. Stored plaintext because demo data is non-sensitive and sandboxed.
   */
  demoDek?: string;
  /** PIN verification hash (PBKDF2), set once. */
  pinHash?: string;
  /** Salt used to derive the PIN KEK. */
  pinSalt?: string;
  /** PIN-wrapped data encryption key (base64 iv.ciphertext). */
  wrappedDekPin?: string;
  obsidian: ObsidianSettings;
}

// ─────────────────────────────────────────────────────────────
// v1.5 collections (flag-gated)
// ─────────────────────────────────────────────────────────────

export interface BlackboardEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: number;
  dtend: number;
  course?: string;
}

export interface BlackboardFeed {
  events: BlackboardEvent[];
  /** sha256(uid) hashes already mirrored → tasks/calendar. */
  mirrored: string[];
  lastSync?: number;
}

export interface NewsSourceConfig {
  id: string;
  enabled: boolean;
}

export interface NewsConfig {
  sources: NewsSourceConfig[];
  /** Saved to notes. */
  saved: string[];
  /** Reading list. */
  readLater: string[];
}

export interface FxCache {
  base: Currency;
  quote: Currency;
  rate: number;
  fetchedAt: number;
}

// ─────────────────────────────────────────────────────────────
// Themes / presets
// ─────────────────────────────────────────────────────────────

export interface ThemePreset {
  name: ThemePresetName;
  label: string;
  accent: string;
  surface: string;
  radius: string;
  font: string;
}

// ─────────────────────────────────────────────────────────────
// Backup
// ─────────────────────────────────────────────────────────────

export interface BackupManifest {
  version: 1;
  schema: "stxic";
  exportedAt: number;
  /** sha256 of the uid (never the raw uid). */
  uidHash: string;
  collections: Array<
    "vault" | "notes" | "tasks" | "income" | "habits" | "focusSessions" | "settings"
  >;
}
