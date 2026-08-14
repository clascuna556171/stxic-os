/**
 * Stxic hydrate — the single typed read/write API for ALL agents.
 *
 * Cross-feature data flows ONLY through this module (docs/AGENT_CORE_FEATURES.md).
 * Client-side only (Firestore via the browser SDK). Every call returns an
 * `Envelope`. Encrypted collections (vault, notes, tasks, income, habits,
 * focusSessions) are AES-GCM encrypted with the in-memory session DEK from
 * `lib/auth/key-holder.ts`; when the session is locked they return
 * `{ ok: false, error: "Session locked" }`.
 */

import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query } from "firebase/firestore";
import { getAuthClient, getDb } from "@/lib/firebase/client";
import { getSessionKey } from "@/lib/auth/key-holder";
import { decryptString, encryptString } from "@/lib/auth/crypto";
import type {
  BlackboardFeed,
  Envelope,
  FocusSession,
  FxCache,
  Habit,
  IncomeEntry,
  NewsConfig,
  Note,
  TaskItem,
  UserSettings,
  VaultItem,
} from "@/types";

const SETTINGS_DOC = "settings/main";

export const DEFAULT_SETTINGS: UserSettings = {
  themePreset: "stxc",
  accent: "#00D4FF",
  theme: "dark",
  autoLockMin: 5,
  defaultCurrency: "PHP",
  obsidian: {
    enabled: false,
    baseUrl: "https://127.0.0.1:27124",
    insecure: false,
    encryptedKey: "",
    mcpUrl: "",
  },
};

function currentUid(): string | null {
  return getAuthClient().currentUser?.uid ?? null;
}

// ─────────────────────────────────────────────────────────────
// Encrypted collection CRUD (vault / notes / tasks / income /
// habits / focusSessions)
// ─────────────────────────────────────────────────────────────

async function readEncrypted<T>(name: string): Promise<Envelope<T[]>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const key = getSessionKey();
  if (!key) return { ok: false, error: "Session locked" };
  try {
    const snap = await getDocs(query(collection(getDb(), `users/${uid}/${name}`)));
    const items: T[] = [];
    for (const d of snap.docs) {
      const cipher = d.data()?.["cipher"];
      if (typeof cipher !== "string") continue;
      const plain = await decryptString(key, cipher);
      items.push(JSON.parse(plain) as T);
    }
    return { ok: true, data: items };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function writeEncrypted<T extends { id: string }>(
  name: string,
  item: T,
): Promise<Envelope<T>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const key = getSessionKey();
  if (!key) return { ok: false, error: "Session locked" };
  try {
    const cipher = await encryptString(key, JSON.stringify(item));
    await setDoc(doc(getDb(), `users/${uid}/${name}/${item.id}`), {
      cipher,
      updatedAt: Date.now(),
    });
    return { ok: true, data: item };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function removeEncrypted(name: string, id: string): Promise<Envelope<null>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await deleteDoc(doc(getDb(), `users/${uid}/${name}/${id}`));
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

// ── Vault ────────────────────────────────────────────────────
export const listVault = () => readEncrypted<VaultItem>("vault");
export const saveVaultItem = (item: VaultItem) => writeEncrypted("vault", item);
export const deleteVaultItem = (id: string) => removeEncrypted("vault", id);

// ── Notes ────────────────────────────────────────────────────
export const listNotes = () => readEncrypted<Note>("notes");
export const saveNote = (item: Note) => writeEncrypted("notes", item);
export const deleteNote = (id: string) => removeEncrypted("notes", id);

// ── Tasks ────────────────────────────────────────────────────
export const listTasks = () => readEncrypted<TaskItem>("tasks");
export const saveTask = (item: TaskItem) => writeEncrypted("tasks", item);
export const deleteTask = (id: string) => removeEncrypted("tasks", id);

// ── Income ───────────────────────────────────────────────────
export const listIncome = () => readEncrypted<IncomeEntry>("income");
export const saveIncomeEntry = (item: IncomeEntry) => writeEncrypted("income", item);
export const deleteIncomeEntry = (id: string) => removeEncrypted("income", id);

// ── Habits ───────────────────────────────────────────────────
export const listHabits = () => readEncrypted<Habit>("habits");
export const saveHabit = (item: Habit) => writeEncrypted("habits", item);
export const deleteHabit = (id: string) => removeEncrypted("habits", id);

// ── Focus sessions ───────────────────────────────────────────
export const listFocusSessions = () => readEncrypted<FocusSession>("focusSessions");
export const saveFocusSession = (item: FocusSession) => writeEncrypted("focusSessions", item);
export const deleteFocusSession = (id: string) => removeEncrypted("focusSessions", id);

// ─────────────────────────────────────────────────────────────
// Settings (plaintext doc; sensitive sub-fields individually encrypted)
// ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Envelope<UserSettings>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}/${SETTINGS_DOC}`));
    const data = snap.data() as Partial<UserSettings> | undefined;
    return {
      ok: true,
      data: {
        ...DEFAULT_SETTINGS,
        obsidian: { ...DEFAULT_SETTINGS.obsidian, ...(data?.obsidian ?? {}) },
        ...data,
      },
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function saveSettings(patch: Partial<UserSettings>): Promise<Envelope<null>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await setDoc(
      doc(getDb(), `users/${uid}/${SETTINGS_DOC}`),
      { ...patch, updatedAt: Date.now() },
      { merge: true },
    );
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

// ── Obsidian config (v1.5, within settings) ──────────────────
// The API key is encrypted with the session DEK; the rest stays plaintext.

export async function getObsidianConfig(): Promise<Envelope<UserSettings["obsidian"]>> {
  const res = await getSettings();
  if (!res.ok) return res;
  const cfg = res.data.obsidian;
  if (!cfg.encryptedKey) return { ok: true, data: cfg };
  const key = getSessionKey();
  if (!key) return { ok: false, error: "Session locked" };
  try {
    const apiKey = await decryptString(key, cfg.encryptedKey);
    return { ok: true, data: { ...cfg, encryptedKey: apiKey } };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function saveObsidianConfig(cfg: UserSettings["obsidian"]): Promise<Envelope<null>> {
  const key = getSessionKey();
  if (!key) return { ok: false, error: "Session locked" };
  try {
    const encryptedKey = cfg.encryptedKey ? await encryptString(key, cfg.encryptedKey) : "";
    await saveSettings({
      obsidian: { ...cfg, encryptedKey, mcpUrl: cfg.mcpUrl },
    });
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// v1.5 config docs (plaintext)
// ─────────────────────────────────────────────────────────────

export async function getNewsConfig(): Promise<Envelope<NewsConfig>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}/newsConfig`));
    const data = (snap.data() ?? {
      sources: [],
      saved: [],
      readLater: [],
    }) as NewsConfig;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function saveNewsConfig(cfg: NewsConfig): Promise<Envelope<null>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await setDoc(doc(getDb(), `users/${uid}/newsConfig`), cfg);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function getBlackboard(): Promise<Envelope<BlackboardFeed>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}/blackboard`));
    const data = (snap.data() ?? { events: [], mirrored: [] }) as BlackboardFeed;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function saveBlackboard(feed: BlackboardFeed): Promise<Envelope<null>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await setDoc(doc(getDb(), `users/${uid}/blackboard`), feed);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

// ── FX cache (frankfurter) ───────────────────────────────────

export async function getFxRate(base: string, quote: string): Promise<Envelope<FxCache>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}/fxCache/${base}_${quote}`));
    if (!snap.exists()) return { ok: false, error: "No cached rate" };
    return { ok: true, data: snap.data() as FxCache };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function saveFxRate(rate: FxCache): Promise<Envelope<null>> {
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  try {
    await setDoc(doc(getDb(), `users/${uid}/fxCache/${rate.base}_${rate.quote}`), rate);
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// Backup snapshot (decrypted, client-side, for the BACKUP agent)
// ─────────────────────────────────────────────────────────────

export interface BackupSnapshot {
  vault: VaultItem[];
  notes: Note[];
  tasks: TaskItem[];
  income: IncomeEntry[];
  habits: Habit[];
  focusSessions: FocusSession[];
  settings: UserSettings;
  newsConfig: NewsConfig;
  blackboard: BlackboardFeed;
}

export async function getAllForBackup(): Promise<Envelope<BackupSnapshot>> {
  const [vault, notes, tasks, income, habits, focusSessions, settings, news, bb] =
    await Promise.all([
      listVault(),
      listNotes(),
      listTasks(),
      listIncome(),
      listHabits(),
      listFocusSessions(),
      getSettings(),
      getNewsConfig(),
      getBlackboard(),
    ]);
  if (
    !vault.ok ||
    !notes.ok ||
    !tasks.ok ||
    !income.ok ||
    !habits.ok ||
    !focusSessions.ok ||
    !settings.ok ||
    !news.ok ||
    !bb.ok
  ) {
    return {
      ok: false,
      error:
        [vault, notes, tasks, income, habits, focusSessions, settings, news, bb].find((r) => !r.ok)
          ?.error ?? "Backup failed",
    };
  }
  return {
    ok: true,
    data: {
      vault: vault.data,
      notes: notes.data,
      tasks: tasks.data,
      income: income.data,
      habits: habits.data,
      focusSessions: focusSessions.data,
      settings: settings.data,
      newsConfig: news.data,
      blackboard: bb.data,
    },
  };
}
