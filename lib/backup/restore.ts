/**
 * Backup restore — client-side. Decrypts a `.stxbak` with the master password,
 * then re-encrypts and upserts each collection through hydrate (which re-seals
 * items under the live session DEK). Settings restore is selective — auth
 * material (PIN hash/salt, wrapped DEKs, Obsidian key) is never overwritten.
 */

import {
  saveAccount,
  saveFocusSession,
  saveHabit,
  saveNote,
  saveSavingsGoal,
  saveSettings,
  saveTask,
  saveTransaction,
  saveVaultItem,
  type BackupSnapshot,
} from "@/lib/hydrate";
import { decryptSnapshot, parseBackup } from "@/lib/backup/format";
import { migrateIncomeToTransactions } from "@/lib/finance";
import type { BackupManifest, UserSettings } from "@/types";

export interface RestoreCounts {
  vault: number;
  notes: number;
  tasks: number;
  transactions: number;
  accounts: number;
  savingsGoals: number;
  habits: number;
  focusSessions: number;
}

export interface RestorePreview {
  manifest: BackupManifest;
  counts: RestoreCounts;
}

export function countsOf(snapshot: BackupSnapshot): RestoreCounts {
  return {
    vault: snapshot.vault.length,
    notes: snapshot.notes.length,
    tasks: snapshot.tasks.length,
    transactions: snapshot.transactions?.length ?? snapshot.income?.length ?? 0,
    accounts: snapshot.accounts?.length ?? 0,
    savingsGoals: snapshot.savingsGoals?.length ?? 0,
    habits: snapshot.habits.length,
    focusSessions: snapshot.focusSessions.length,
  };
}

export async function previewRestore(
  masterPassword: string,
  text: string,
): Promise<RestorePreview> {
  const file = parseBackup(text);
  const snapshot = await decryptSnapshot(masterPassword, file);
  return { manifest: file.manifest, counts: countsOf(snapshot) };
}

function settingsPatch(settings: BackupSnapshot["settings"]): Partial<UserSettings> {
  const patch: Partial<UserSettings> = {
    themePreset: settings.themePreset,
    accent: settings.accent,
    theme: settings.theme,
    autoLockMin: settings.autoLockMin,
    defaultCurrency: settings.defaultCurrency,
  };
  if (settings.clocks) patch.clocks = settings.clocks;
  return patch;
}

export async function restoreBackup(
  masterPassword: string,
  text: string,
): Promise<{ ok: boolean; error?: string; counts: RestoreCounts }> {
  const empty: RestoreCounts = {
    vault: 0,
    notes: 0,
    tasks: 0,
    transactions: 0,
    accounts: 0,
    savingsGoals: 0,
    habits: 0,
    focusSessions: 0,
  };
  try {
    const file = parseBackup(text);
    const snapshot = await decryptSnapshot(masterPassword, file);

    // Backward-compat: backups exported before the finance tracker only hold
    // `income` — migrate those into the unified transactions ledger.
    const transactions =
      snapshot.transactions ?? migrateIncomeToTransactions(snapshot.income ?? []);

    for (const item of snapshot.vault) await saveVaultItem(item);
    for (const item of snapshot.notes) await saveNote(item);
    for (const item of snapshot.tasks) await saveTask(item);
    for (const item of transactions) await saveTransaction(item);
    for (const item of snapshot.accounts ?? []) await saveAccount(item);
    for (const item of snapshot.savingsGoals ?? []) await saveSavingsGoal(item);
    for (const item of snapshot.habits) await saveHabit(item);
    for (const item of snapshot.focusSessions) await saveFocusSession(item);
    await saveSettings(settingsPatch(snapshot.settings));

    return { ok: true, counts: countsOf(snapshot) };
  } catch (error) {
    return { ok: false, error: (error as Error).message, counts: empty };
  }
}
