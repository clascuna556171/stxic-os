/**
 * Vault-specific helpers. Purely local — reuse detection hashes passwords in
 * memory (SHA-256) so plaintexts are never compared across the network.
 */

import type { VaultItem } from "@/types";
import { toHex } from "@/lib/auth/crypto";

/** SHA-256 hex digest of a password (local only). */
export async function passwordHash(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(new Uint8Array(buf));
}

/**
 * Ids of vault items whose password matches at least one other item's
 * password (reused). Empty passwords are ignored.
 */
export async function reusedPasswordIds(items: VaultItem[]): Promise<Set<string>> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    if (!item.password) continue;
    const hash = await passwordHash(item.password);
    const ids = groups.get(hash) ?? [];
    ids.push(item.id);
    groups.set(hash, ids);
  }
  const reused = new Set<string>();
  for (const ids of groups.values()) {
    if (ids.length > 1) for (const id of ids) reused.add(id);
  }
  return reused;
}

/** Distinct folder names from a set of items (unfiled = empty string). */
export function vaultFolders(items: VaultItem[]): string[] {
  const folders = new Set<string>();
  for (const item of items) folders.add(item.folder);
  return [...folders].sort((a, b) => a.localeCompare(b));
}

/** Distinct tags from a set of items. */
export function vaultTags(items: VaultItem[]): string[] {
  const tags = new Set<string>();
  for (const item of items) for (const tag of item.tags) tags.add(tag);
  return [...tags].sort((a, b) => a.localeCompare(b));
}
