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
users/{uid}/income/{id}          # LEGACY income entries, ENCRYPTED (migration only)
users/{uid}/transactions/{id}    # finance ledger (income/expense), ENCRYPTED
users/{uid}/accounts/{id}        # cards/banks w/ manual balances, ENCRYPTED
users/{uid}/savingsGoals/{id}    # savings goals w/ targets, ENCRYPTED
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
- `UserProfile, VaultItem, Note, TaskItem, Transaction, FinanceAccount,
  SavingsGoal, Habit, FocusSession, UserSettings, BlackboardFeed, NewsConfig,
  FxCache, ThemePreset, BackupManifest`.
- Legacy `IncomeEntry` remains only for one-time migration + old backups.
- Collections: encrypted `vault`, `notes`, `tasks`, `transactions`, `accounts`,
  `savingsGoals`, `habits`, `focusSessions` under `users/{uid}/…`.

## Done
- `npm run build` passes · `firestore.rules` complete (deny-all / own-uid,
  sandboxed `demo` namespace) with emulator rules tests green
  (`npm run test:rules`) · AES-GCM + PBKDF2 round-trip and DEK wrap/unwrap
  tests green (`npm test`) · session-cookie server actions
  (`establishSession` / `endSession` / `setPin` / `verifyPin` /
  `saveMasterPassword`) implemented in `lib/auth/actions.ts`.
- Dev runs at zero cost via the Auth/Firestore emulators (`npm run emulators`).
  Real-project config drops into `.env.local` when ready.
- Emulators need Java 17+; `firebase-tools` is pinned to `^13` (v14+ requires
  Java 21).
- Login→PIN→dashboard UI lands in the UI System tier (next section).
