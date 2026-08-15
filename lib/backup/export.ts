/**
 * Backup export — client-side. The server never sees the data: we read the
 * decrypted snapshot via hydrate, then seal it with the master password.
 */

import { getAllForBackup } from "@/lib/hydrate";
import { getAuthClient } from "@/lib/firebase/client";
import { encryptSnapshot, serializeBackup } from "@/lib/backup/format";

/** Build an encrypted `.stxbak` Blob for the current user. */
export async function exportBackup(masterPassword: string): Promise<Blob> {
  const uid = getAuthClient().currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const res = await getAllForBackup();
  if (!res.ok) throw new Error(res.error);
  const file = await encryptSnapshot(uid, masterPassword, res.data);
  return new Blob([serializeBackup(file)], { type: "application/json" });
}

/** Trigger a browser download of a `.stxbak` Blob. */
export function downloadBackup(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".stxbak") ? filename : `${filename}.stxbak`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
