/**
 * Backup restore — client-side. Decrypts a `.stxbak` with the master password,
 * then re-encrypts and upserts each collection through hydrate (which re-seals
 * items under the live session DEK). Settings restore is selective — auth
 * material (PIN hash/salt, wrapped DEKs, Obsidian key) is never overwritten.
 */

import {
  saveFocusSession,
  saveHabit,
  saveIncomeEntry,
  saveNote,
  saveSettings,
  saveTask,
  saveVaultItem,
  type BackupSnapshot,
} from "@/lib/hydrate";
import { decryptSnapshot, parseBackup } from "@/lib/backup/format";
import type { BackupManifest, UserSettings } from "@/types";

export interface RestoreCounts {
  vault: number;
  notes: number;
  tasks: number;
  income: number;
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
    income: snapshot.income.length,
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
    income: 0,
    habits: 0,
    focusSessions: 0,
  };
  try {
    const file = parseBackup(text);
    const snapshot = await decryptSnapshot(masterPassword, file);
    const counts = countsOf(snapshot);

    for (const item of snapshot.vault) await saveVaultItem(item);
    for (const item of snapshot.notes) await saveNote(item);
    for (const item of snapshot.tasks) await saveTask(item);
    for (const item of snapshot.income) await saveIncomeEntry(item);
    for (const item of snapshot.habits) await saveHabit(item);
    for (const item of snapshot.focusSessions) await saveFocusSession(item);
    await saveSettings(settingsPatch(snapshot.settings));

    return { ok: true, counts };
  } catch (error) {
    return { ok: false, error: (error as Error).message, counts: empty };
  }
}
