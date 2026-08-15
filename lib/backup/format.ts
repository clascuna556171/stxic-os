/**
 * Backup file format (.stxbak) — pure, unit-tested.
 *
 * A `.stxbak` is a single JSON envelope:
 *   { manifest, salt, ciphertext }
 * where `ciphertext` is the AES-GCM-encrypted decrypted snapshot and `salt`
 * is the PBKDF2 salt used to derive the backup key from the master password.
 */

import {
  deriveBackupKey,
  decryptString,
  encryptString,
  generateSalt,
  toHex,
} from "@/lib/auth/crypto";
import type { BackupManifest } from "@/types";
import type { BackupSnapshot } from "@/lib/hydrate";

export const BACKUP_VERSION = 1 as const;
export const BACKUP_SCHEMA = "stxic" as const;

export const BACKUP_COLLECTIONS = [
  "vault",
  "notes",
  "tasks",
  "income",
  "habits",
  "focusSessions",
  "settings",
] as const;

export interface BackupFile {
  manifest: BackupManifest;
  salt: string;
  ciphertext: string;
}

/** SHA-256 of the uid — never store the raw uid in a backup. */
export async function uidHash(uid: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(uid));
  return toHex(new Uint8Array(buf));
}

/** Build the plaintext manifest header for a backup. */
export async function buildManifest(uid: string, exportedAt = Date.now()): Promise<BackupManifest> {
  return {
    version: BACKUP_VERSION,
    schema: BACKUP_SCHEMA,
    exportedAt,
    uidHash: await uidHash(uid),
    collections: [...BACKUP_COLLECTIONS],
  };
}

/** Seal a decrypted snapshot into a `.stxbak` envelope with the master password. */
export async function encryptSnapshot(
  uid: string,
  masterPassword: string,
  snapshot: BackupSnapshot,
): Promise<BackupFile> {
  const salt = generateSalt();
  const key = await deriveBackupKey(masterPassword, salt);
  const ciphertext = await encryptString(key, JSON.stringify(snapshot));
  return { manifest: await buildManifest(uid), salt, ciphertext };
}

/** Unseal a `.stxbak` envelope with the master password. Throws on bad password. */
export async function decryptSnapshot(
  masterPassword: string,
  file: BackupFile,
): Promise<BackupSnapshot> {
  if (file.manifest.schema !== BACKUP_SCHEMA) throw new Error("Not a Stxic backup");
  if (file.manifest.version !== BACKUP_VERSION) throw new Error("Unsupported backup version");
  const key = await deriveBackupKey(masterPassword, file.salt);
  const plain = await decryptString(key, file.ciphertext);
  return JSON.parse(plain) as BackupSnapshot;
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file);
}

/** Parse a `.stxbak` text; validates the required fields are present. */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid backup file");
  }
  if (typeof parsed !== "object" || parsed === null) throw new Error("Invalid backup file");
  const file = parsed as Partial<BackupFile>;
  if (!file.manifest || typeof file.salt !== "string" || typeof file.ciphertext !== "string") {
    throw new Error("Invalid backup file");
  }
  return file as BackupFile;
}
