# Stxic — Roadmap & Checklist

> Check off items as they ship. Keep this file updated in every PR.
> Statuses: `[ ]` = not started · `[~]` = in progress · `[x]` = done

## 0. Foundation
- [x] Scaffold Next.js repo (TS + Tailwind + App Router) — Next 16.3.1
- [x] Commit this `docs/` folder + master context
- [x] Set up ESLint + Prettier + strict TS
- [x] Add GitHub repo + issue templates (OSS-ready) — pushed to origin
- [x] Configure env vars (`.env.example` + `process.env` reference list in README)

## 1. v1 Core
### Auth & Data (AGENT AUTH_DB)
- [x] Firebase project + Firestore security rules (emulator-first; real project drops into `.env.local`)
- [x] Email/password signup/login (backend + session cookie; UI in UI System tier)
- [x] PIN lock (4-6 digit) + auto-lock timer (backend set/verify; auto-lock UI in UI System tier)
- [x] Client-side AES-256 (PBKDF2 → AES-GCM)
- [x] All `types/*.ts` stable + exported
- [x] `firestore.rules` deny-all / own-uid only (+ emulator rules tests)
### Orchestration (AGENT API)
- [x] proxy login guard (Next 16 `proxy.ts` — middleware renamed)
- [x] `lib/hydrate.ts` all collections
- [x] feature flags + hidden nav
- [x] route stubs + `docs/API.md`
### UI System (AGENT UI)
- [x] UI craft skill adopted (AGENT_UI_SKILL.md: anti-slop, 3 dials, a11y, motion)
- [x] design tokens dark + light
- [x] preset registry (Stxc, Mars, Midnight, Mono)
- [x] accent picker + live preview
- [x] primitive components library
- [x] command palette (⌘K / Ctrl+K)
- [x] manifest + service worker (PWA installable) — manual SW; `@serwist/next` deferred (webpack vs Turbopack)
### Core Features (AGENT CORE)
- [x] Vault (folders/tags/favorites + generator + strength meter)
- [x] Notes (markdown, folders, autosave, templates, export)
- [x] Tasks (Kanban + drag-drop + calendar + P0-P2)
- [x] Income (multi-currency entries, charts, CSV)
- [x] World clocks
- [x] Dashboard (income chart, clocks, tasks, FX card)
- [x] FX converter (frankfurter, 1h cache, stale badge)
- [x] Focus timer (Pomodoro + session logs + weekly stat)
- [x] Password strength + reused-password badges
### Backup & Demo (AGENT BACKUP_DEMO)
- [x] .stxbak encrypted export + restore
- [x] Demo/guest mode (sandboxed sample data)
### Performance gate
- [x] LCP < 2.5s · CLS < 0.1 · INP < 200ms spot-check — desktop 0.99 (LCP 0.8s, CLS 0, TBT 50ms); mobile lab (4×CPU/slow-4G) LCP 6.2s on login, CLS 0, TBT 0ms
- [x] Route code-splitting + lazy-load charts/editors
- [x] Firestore read pagination + indexes (read cap; no composite indexes needed)
- [x] PWA install test on phone (manual — Android via `adb reverse`; installed + launched standalone)
- [x] **v1 release tag v1.0.0** 🎉

## 2. v1.5 Extras (flag-gated)
- [x] News hub: RSS/Atom aggregate + TL;DR + save to notes (official lab feeds + Reddit sources)
- [x] Reading list (save for later → notes)
- [x] AI chat (Groq streaming + Ollama local fallback)
- [x] AI daily digest on dashboard
- [x] AI study planner
- [x] BADS-DE: iCal sync + drafts + risk pill (UM Blackboard) — sync button in Tasks + Semester
- [ ] BADS-DE: Google Calendar OAuth2 mirror (deferred)
- [x] Habit tracker (streaks + AI nudges)
- [x] File→text converter (PDF/DOCX/TXT/MD/CSV/XLSX/HTML)
- [x] Obsidian format: export + vault import + wikilinks render
- [x] Obsidian LIVE hybrid (Local REST API + MCP): Settings panel + Test Connection
- [x] Obsidian LIVE hybrid: `lib/obsidian/client.ts` REST client (client-side)
- [x] Obsidian LIVE hybrid: Push/Pull buttons + vault browser + confirm dialog
- [x] Obsidian LIVE hybrid: MCP config-only (no agent) + cert-trust docs
- [x] Obsidian graph view (dashboard widget — vault nodes + links)
- [x] Semester planner (term grid)
- [x] Custom dashboard grid (drag-resize widgets)
- [x] AI OCR for scanned PDFs (after converter)
- [ ] **v1.5 release tag v1.5.0** — push `main` + tag

## 3. v2 Future (not scheduled)
- [x] Android APK via Capacitor (same codebase) — thin shell loading deployed URL; `cap:sync`/`cap:open`
- [x] WebAuthn biometric unlock (Android + web, PRF extension) — flag `biometric`
- [x] Push notifications (FCM web + Capacitor native) — flag `push`
- [x] Note "publish to web" (Obsidian Publish alt) — `/p/[slug]`, flag `publish`
- [x] **Finance tracker** — Income upgraded: unified transactions ledger
  (income + expenses), manual account balances (cards/banks), savings goals,
  overview stats + income-vs-expense chart; nav/dashboard rebranded to Finance;
  backups extended (old `.stxbak` restores migrate income → transactions)
- [ ] Offline-first sync queue
- [ ] Optional one-time paid tier (reserved `plan` field) FUTURE
- [x] **v2 release tag v2.0.0** — deployed to Vercel (stxic-os.vercel.app) + Firebase (stxic-os)

## 4. Dropped / Revisit Later
- [x] ~~YT → MP4~~ — dropped (ToS + server cost). Documented in master.
- [ ] Quick capture / inbox note (not selected — could revisit)
- [ ] End-of-day review (not selected — could revisit)
- [x] Backlinks graph panel (Obsidian — future option)
- [ ] Two-way live vault watch (Obsidian — future option)
