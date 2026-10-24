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

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
} from "firebase/firestore";
import { getAuthClient, getDb } from "@/lib/firebase/client";
import { getSessionKey } from "@/lib/auth/key-holder";
import { decryptString, encryptString } from "@/lib/auth/crypto";
import { isLocalDemoActive } from "@/lib/demo/local";
import type {
  BlackboardFeed,
  Envelope,
  FinanceAccount,
  FocusSession,
  FxCache,
  Habit,
  IncomeEntry,
  NewsConfig,
  Note,
  SavingsGoal,
  TaskItem,
  Transaction,
  UserProfile,
  UserSettings,
  VaultItem,
} from "@/types";

const SETTINGS_DOC = "settings/main";

/**
 * Cap on the number of docs read per encrypted collection. Personal-scale
 * data rarely exceeds this; full pagination/infinite-scroll is a future task.
 * Single-field own-uid subcollection reads are auto-indexed — no composite
 * indexes are required.
 */
const READ_LIMIT = 500;

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

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

// ─────────────────────────────────────────────────────────────
// Encrypted collection CRUD (vault / notes / tasks / income /
// habits / focusSessions)
// ─────────────────────────────────────────────────────────────

async function readEncrypted<T extends { id?: string }>(name: string): Promise<Envelope<T[]>> {
  if (isLocalDemoActive()) {
    try {
      const raw = window.localStorage.getItem(`stxic_demo_${name}`);
      const data = raw ? (JSON.parse(raw) as T[]) : [];
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const key = getSessionKey();
  if (!key) return { ok: false, error: "Session locked" };
  const localCacheKey = `stxic_enc_${uid}_${name}`;
  try {
    const snap = await getDocs(
      query(collection(getDb(), `users/${uid}/${name}`), limit(READ_LIMIT)),
    );
    const byId = new Map<string, T>();
    for (const d of snap.docs) {
      const cipher = d.data()?.["cipher"];
      if (typeof cipher !== "string") continue;
      try {
        const plain = await decryptString(key, cipher);
        const parsed = JSON.parse(plain) as T;
        byId.set(d.id, parsed);
      } catch {
        // skip undecryptable record
      }
    }
    const localCiphers = readLocalJson<Record<string, string>>(localCacheKey, {});
    for (const [docId, cipher] of Object.entries(localCiphers)) {
      if (byId.has(docId) || typeof cipher !== "string") continue;
      try {
        const plain = await decryptString(key, cipher);
        byId.set(docId, JSON.parse(plain) as T);
      } catch {
        // skip
      }
    }
    return { ok: true, data: [...byId.values()] };
  } catch {
    // Fallback to locally cached encrypted records when Firestore is unreachable
    try {
      const localCiphers = readLocalJson<Record<string, string>>(localCacheKey, {});
      const items: T[] = [];
      for (const cipher of Object.values(localCiphers)) {
        if (typeof cipher !== "string") continue;
        const plain = await decryptString(key, cipher);
        items.push(JSON.parse(plain) as T);
      }
      return { ok: true, data: items };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
}

async function writeEncrypted<T extends { id: string }>(
  name: string,
  item: T,
): Promise<Envelope<T>> {
  if (isLocalDemoActive()) {
    try {
      const raw = window.localStorage.getItem(`stxic_demo_${name}`);
      const items = raw ? (JSON.parse(raw) as T[]) : [];
      const idx = items.findIndex((x) => x.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      window.localStorage.setItem(`stxic_demo_${name}`, JSON.stringify(items));
      return { ok: true, data: item };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const key = getSessionKey();
  if (!key) return { ok: false, error: "Session locked" };
  try {
    const cipher = await encryptString(key, JSON.stringify(item));
    const localCacheKey = `stxic_enc_${uid}_${name}`;
    const localCiphers = readLocalJson<Record<string, string>>(localCacheKey, {});
    localCiphers[item.id] = cipher;
    writeLocalJson(localCacheKey, localCiphers);
    try {
      await setDoc(doc(getDb(), `users/${uid}/${name}/${item.id}`), {
        cipher,
        updatedAt: Date.now(),
      });
    } catch {
      // Preserved in encrypted local cache if Firestore write fails
    }
    return { ok: true, data: item };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

async function removeEncrypted(name: string, id: string): Promise<Envelope<null>> {
  if (isLocalDemoActive()) {
    try {
      const raw = window.localStorage.getItem(`stxic_demo_${name}`);
      const items = raw ? (JSON.parse(raw) as { id: string }[]) : [];
      const filtered = items.filter((x) => x.id !== id);
      window.localStorage.setItem(`stxic_demo_${name}`, JSON.stringify(filtered));
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const localCacheKey = `stxic_enc_${uid}_${name}`;
  const localCiphers = readLocalJson<Record<string, string>>(localCacheKey, {});
  if (id in localCiphers) {
    delete localCiphers[id];
    writeLocalJson(localCacheKey, localCiphers);
  }
  try {
    await deleteDoc(doc(getDb(), `users/${uid}/${name}/${id}`));
    return { ok: true, data: null };
  } catch {
    return { ok: true, data: null };
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
// Legacy income collection — only read (and cleaned up) during the one-time
// migration into the unified `transactions` ledger. See lib/finance.ts.
export const listIncome = () => readEncrypted<IncomeEntry>("income");
export const deleteIncomeEntry = (id: string) => removeEncrypted("income", id);

// ── Transactions (finance ledger) ─────────────────────────────
export const listTransactions = () => readEncrypted<Transaction>("transactions");
export const saveTransaction = (item: Transaction) => writeEncrypted("transactions", item);
export const deleteTransaction = (id: string) => removeEncrypted("transactions", id);

// ── Accounts (cards / banks, manual balances) ─────────────────
export const listAccounts = () => readEncrypted<FinanceAccount>("accounts");
export const saveAccount = (item: FinanceAccount) => writeEncrypted("accounts", item);
export const deleteAccount = (id: string) => removeEncrypted("accounts", id);

// ── Savings goals ─────────────────────────────────────────────
export const listSavingsGoals = () => readEncrypted<SavingsGoal>("savingsGoals");
export const saveSavingsGoal = (item: SavingsGoal) => writeEncrypted("savingsGoals", item);
export const deleteSavingsGoal = (id: string) => removeEncrypted("savingsGoals", id);

// ── Habits ───────────────────────────────────────────────────
export const listHabits = () => readEncrypted<Habit>("habits");
export const saveHabit = (item: Habit) => writeEncrypted("habits", item);
export const deleteHabit = (id: string) => removeEncrypted("habits", id);

// ── Focus sessions ───────────────────────────────────────────
export const listFocusSessions = () => readEncrypted<FocusSession>("focusSessions");
export const saveFocusSession = (item: FocusSession) => writeEncrypted("focusSessions", item);
export const deleteFocusSession = (id: string) => removeEncrypted("focusSessions", id);

// ─────────────────────────────────────────────────────────────
// Profile (users/{uid} doc — salts + wrapped DEKs)
// ─────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Envelope<UserProfile>> {
  if (isLocalDemoActive()) {
    const saved = readLocalJson<Partial<UserProfile>>("stxic_demo_profile", {});
    return {
      ok: true,
      data: {
        uid: "demo-guest",
        email: "guest@demo.local",
        displayName: "Demo Guest",
        createdAt: Date.now(),
        encKeySalt: "",
        wrappedDekMaster: "",
        hasPin: true,
        plan: "free",
        ...saved,
      },
    };
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const u = getAuthClient().currentUser;
  const localCacheKey = `stxic_user_profile_${uid}`;
  const localSaved = readLocalJson<Partial<UserProfile>>(localCacheKey, {});
  const defaultProfile: UserProfile = {
    uid,
    email: u?.email ?? "",
    displayName: u?.displayName ?? undefined,
    createdAt: Date.now(),
    encKeySalt: "",
    wrappedDekMaster: "",
    hasPin: false,
    plan: "free",
    ...localSaved,
  };
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}`));
    if (!snap.exists()) {
      return { ok: true, data: defaultProfile };
    }
    const merged: UserProfile = {
      ...defaultProfile,
      ...(snap.data() as Partial<UserProfile>),
      uid,
    };
    writeLocalJson(localCacheKey, merged);
    return { ok: true, data: merged };
  } catch {
    return { ok: true, data: defaultProfile };
  }
}

export async function saveProfile(
  patch: Partial<Omit<UserProfile, "uid">>,
): Promise<Envelope<null>> {
  if (isLocalDemoActive()) {
    try {
      const current = readLocalJson<Partial<UserProfile>>("stxic_demo_profile", {});
      writeLocalJson("stxic_demo_profile", { ...current, ...patch, updatedAt: Date.now() });
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const localCacheKey = `stxic_user_profile_${uid}`;
  const current = readLocalJson<Partial<UserProfile>>(localCacheKey, {});
  writeLocalJson(localCacheKey, { ...current, ...patch, uid, updatedAt: Date.now() });
  try {
    await setDoc(
      doc(getDb(), `users/${uid}`),
      { ...patch, uid, updatedAt: Date.now() },
      { merge: true },
    );
  } catch {
    // Preserved in local cache when Firestore write fails
  }
  return { ok: true, data: null };
}

// ─────────────────────────────────────────────────────────────
// Settings (plaintext doc; sensitive sub-fields individually encrypted)
// ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Envelope<UserSettings>> {
  if (isLocalDemoActive()) {
    try {
      const data = readLocalJson<Partial<UserSettings>>("stxic_demo_settings", {});
      return {
        ok: true,
        data: {
          ...DEFAULT_SETTINGS,
          ...data,
          obsidian: { ...DEFAULT_SETTINGS.obsidian, ...(data?.obsidian ?? {}) },
        },
      };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const localCacheKey = `stxic_user_settings_${uid}`;
  const localData = readLocalJson<Partial<UserSettings>>(localCacheKey, {});
  try {
    const snap = await getDoc(doc(getDb(), `users/${uid}/${SETTINGS_DOC}`));
    const remoteData = snap.data() as Partial<UserSettings> | undefined;
    const merged: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...localData,
      ...remoteData,
      obsidian: {
        ...DEFAULT_SETTINGS.obsidian,
        ...(localData?.obsidian ?? {}),
        ...(remoteData?.obsidian ?? {}),
      },
    };
    writeLocalJson(localCacheKey, merged);
    return { ok: true, data: merged };
  } catch {
    return {
      ok: true,
      data: {
        ...DEFAULT_SETTINGS,
        ...localData,
        obsidian: { ...DEFAULT_SETTINGS.obsidian, ...(localData?.obsidian ?? {}) },
      },
    };
  }
}

export async function saveSettings(patch: Partial<UserSettings>): Promise<Envelope<null>> {
  if (isLocalDemoActive()) {
    try {
      const data = readLocalJson<Partial<UserSettings>>("stxic_demo_settings", {});
      writeLocalJson("stxic_demo_settings", { ...data, ...patch, updatedAt: Date.now() });
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
  const uid = currentUid();
  if (!uid) return { ok: false, error: "Unauthorized" };
  const localCacheKey = `stxic_user_settings_${uid}`;
  const localData = readLocalJson<Partial<UserSettings>>(localCacheKey, {});
  writeLocalJson(localCacheKey, { ...localData, ...patch, updatedAt: Date.now() });
  try {
    await setDoc(
      doc(getDb(), `users/${uid}/${SETTINGS_DOC}`),
      { ...patch, updatedAt: Date.now() },
      { merge: true },
    );
  } catch {
    // Preserved in local cache when Firestore write fails
  }
  return { ok: true, data: null };
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
  if (isLocalDemoActive()) {
    try {
      const raw = window.localStorage.getItem("stxic_demo_newsConfig");
      const data = (raw ? JSON.parse(raw) : { sources: [], saved: [], readLater: [] }) as NewsConfig;
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
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
  if (isLocalDemoActive()) {
    try {
      window.localStorage.setItem("stxic_demo_newsConfig", JSON.stringify(cfg));
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
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
  if (isLocalDemoActive()) {
    try {
      const raw = window.localStorage.getItem("stxic_demo_blackboard");
      const data = (raw ? JSON.parse(raw) : { events: [], mirrored: [] }) as BlackboardFeed;
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
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
  if (isLocalDemoActive()) {
    try {
      window.localStorage.setItem("stxic_demo_blackboard", JSON.stringify(feed));
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
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
  if (isLocalDemoActive()) {
    try {
      const raw = window.localStorage.getItem(`stxic_demo_fxCache_${base}_${quote}`);
      if (!raw) return { ok: false, error: "No cached rate" };
      return { ok: true, data: JSON.parse(raw) as FxCache };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
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
  if (isLocalDemoActive()) {
    try {
      window.localStorage.setItem(`stxic_demo_fxCache_${rate.base}_${rate.quote}`, JSON.stringify(rate));
      return { ok: true, data: null };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  }
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
  /** Legacy income entries — only present in backups exported before the finance tracker. */
  income?: IncomeEntry[];
  transactions: Transaction[];
  accounts: FinanceAccount[];
  savingsGoals: SavingsGoal[];
  habits: Habit[];
  focusSessions: FocusSession[];
  settings: UserSettings;
  newsConfig: NewsConfig;
  blackboard: BlackboardFeed;
}

export async function getAllForBackup(): Promise<Envelope<BackupSnapshot>> {
  const [vault, notes, tasks, income, transactions, accounts, savingsGoals, habits, focusSessions, settings, news, bb] =
    await Promise.all([
      listVault(),
      listNotes(),
      listTasks(),
      listIncome(),
      listTransactions(),
      listAccounts(),
      listSavingsGoals(),
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
    !transactions.ok ||
    !accounts.ok ||
    !savingsGoals.ok ||
    !habits.ok ||
    !focusSessions.ok ||
    !settings.ok ||
    !news.ok ||
    !bb.ok
  ) {
    return {
      ok: false,
      error:
        [vault, notes, tasks, income, transactions, accounts, savingsGoals, habits, focusSessions, settings, news, bb].find(
          (r) => !r.ok,
        )?.error ?? "Backup failed",
    };
  }
  return {
    ok: true,
    data: {
      vault: vault.data,
      notes: notes.data,
      tasks: tasks.data,
      income: income.data,
      transactions: transactions.data,
      accounts: accounts.data,
      savingsGoals: savingsGoals.data,
      habits: habits.data,
      focusSessions: focusSessions.data,
      settings: settings.data,
      newsConfig: news.data,
      blackboard: bb.data,
    },
  };
}
