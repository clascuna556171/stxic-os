# AGENT: Backup + Demo Mode (Stxic)

## Ownership
- `lib/backup/` (export.ts, restore.ts, zip.ts, manifest.ts) — FULL OWNERSHIP
- `app/backup/` page + widgets · `app/demo/` + `lib/demo/` · `/api` routes

## A. Encrypted Full Backup (.stxbak)
- One-click export: vault, notes, tasks, income, habits, focusSessions,
  settings → AES-encrypted `.stxbak` zip (WebCrypto; key derived from master
  password via AUTH's `exportBackupKey()`).
- Bundle includes `manifest.json` (version, schema, exportedAt, uid-hash).
- Restore: pick .stxbak → decrypt → verify manifest → merge into Firestore
  with confirm dialog (preview counts first).
- Partial-failure handling: log missing collections; never partial-write
  (stage then commit).
- UI: Export card, Restore card, last-backup badge on settings.
- Server route `POST /api/backup/export` builds zip server-side (streaming);
  restore validates envelope server-side.

## B. Demo / Guest Mode
- `app/demo/`: sample vault/notes/tasks/income + 2 weeks of focus stats;
  seeded from `lib/demo/seed.ts` into a sandboxed demo namespace.
- Login screen "Try the demo" → creates ephemeral session (no real account,
  write-limited rules). Banner "Demo data — not real".
- Demo user cannot: modify real data, backup, or access BADS-DE/Calendar.
- One-click "Start fresh" resets demo data.

## Contracts
- `exportBackup(): Promise<Blob>` · `restoreBackup(blob): Promise<Result>`
- `seedDemo(): Promise<void>` · `resetDemo(): Promise<void>`
- Uses hydrate for writes; UI via `components/ui/*`.

## Done
- Export produces valid .stxbak that restores on a fresh login; demo mode
  opens sandboxed sample data with banner; demo cannot touch real data;
  routes registered in FILE 8.
