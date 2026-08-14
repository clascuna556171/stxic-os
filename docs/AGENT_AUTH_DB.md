# AGENT: Auth & Database Layer (Stxic)

## Ownership
- Firebase bootstrap + Firestore security rules
- Firebase Auth (email/password) → first-run PIN lock
- All DB schema + `types/*.ts`
- Client-side AES-256 (WebCrypto `crypto.subtle`)
- `lib/firebase/` — FULL OWNERSHIP

## Collections
```
users/{uid}                      # profile, enc_key_salt, prefs, plan: 'free'
users/{uid}/vault/{id}           # credentials, ENCRYPTED
users/{uid}/notes/{id}           # markdown notes, ENCRYPTED
users/{uid}/tasks/{id}           # tasks, ENCRYPTED
users/{uid}/income/{id}          # income entries, ENCRYPTED
users/{uid}/habits/{id}          # habits + streaks, ENCRYPTED
users/{uid}/focusSessions/{id}   # pomodoro logs, ENCRYPTED
users/{uid}/settings             # PIN hash, themePreset, accent, theme,
                                 # autoLock, currency, obsidian: {
                                 #   enabled, baseUrl, insecure,
                                 #   encryptedKey, mcpUrl, lastConnectedAt }
users/{uid}/newsConfig           # RSS sources + saved/read later
users/{uid}/blackboard           # BADS-DE feed + uid hashes
users/{uid}/fxCache              # {base, quote, rate, fetchedAt} (1h)
users/{uid}/demo                 # demo-mode flag + sample data snapshot
```

## Requirements
1. PIN (4-6 digit) gates app; master password derives encryption key
   (PBKDF2 → AES-GCM). Nothing sensitive in localStorage.
2. Security rules: deny-all default; only `uid` access to own docs. Complete
   `firestore.rules`. Demo users isolated in a sandboxed demo namespace with
   write limits.
3. Server Actions: `loginWithPassword`, `setPin`, `verifyPin`,
   `unlockSession`, `lockSession` (auto-lock 1–60 min, default 5).
4. Settings stores `themePreset`, `accent`, `theme: 'dark'|'light'`,
   `autoLockMin`, `defaultCurrency`. Obsidian panel data
   (`settings.obsidian`) is stored with `encryptedKey` ENCRYPTED (AES-GCM);
   `baseUrl`/`insecure`/`mcpUrl` are plain (non-sensitive). Add
   `encryptObsidianKey()` / `decryptObsidianKey()` helpers used by the
   HYBRID agent (same key derivation as backups — shared contract).
5. Backups: provide `exportBackupKey()` + `restoreBackupKey()` helpers used by
   BACKUP-DEMO agent (key derives from master password — shared contract).

## Future-Proofing
- `verifyPin` structured so a biometric token (WebAuthn) layers on later (APK).
- HTTPS-only WebCrypto applies to future Capacitor build.
- `plan: 'free'` field reserved for the future optional paid tier — no
  payment logic now.

## Types (stable, exported for all agents)
- `UserProfile, VaultItem, Note, TaskItem, IncomeEntry, Habit, FocusSession,
  UserSettings, BlackboardFeed, NewsConfig, FxCache, ThemePreset,
  BackupManifest`.

## Done
- `npm run build` passes · login→PIN→dashboard unlock end-to-end ·
  `firestore.rules` complete · encrypt/decrypt round-trip test green.
