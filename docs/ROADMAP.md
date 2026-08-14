# Stxic — Roadmap & Checklist

> Check off items as they ship. Keep this file updated in every PR.
> Statuses: `[ ]` = not started · `[~]` = in progress · `[x]` = done

## 0. Foundation
- [x] Scaffold Next.js repo (TS + Tailwind + App Router) — Next 16.3.1
- [x] Commit this `docs/` folder + master context
- [x] Set up ESLint + Prettier + strict TS
- [~] Add GitHub repo + issue templates (OSS-ready) — templates committed; push pending
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
- [ ] middleware login guard
- [ ] `lib/hydrate.ts` all collections
- [ ] feature flags + hidden nav
- [ ] route stubs + `docs/API.md`
### UI System (AGENT UI)
- [ ] UI craft skill adopted (AGENT_UI_SKILL.md: anti-slop, 3 dials, a11y, motion)
- [ ] design tokens dark + light
- [ ] preset registry (Stxc, Mars, Midnight, Mono)
- [ ] accent picker + live preview
- [ ] primitive components library
- [ ] command palette (⌘K / Ctrl+K)
- [ ] manifest + service worker (PWA installable)
### Core Features (AGENT CORE)
- [ ] Vault (folders/tags/favorites + generator + strength meter)
- [ ] Notes (markdown, folders, autosave, templates, export)
- [ ] Tasks (Kanban + drag-drop + calendar + P0-P2)
- [ ] Income (multi-currency entries, charts, CSV)
- [ ] World clocks
- [ ] Dashboard (income chart, clocks, tasks, FX card)
- [ ] FX converter (frankfurter, 1h cache, stale badge)
- [ ] Focus timer (Pomodoro + session logs + weekly stat)
- [ ] Password strength + reused-password badges
### Backup & Demo (AGENT BACKUP_DEMO)
- [ ] .stxbak encrypted export + restore
- [ ] Demo/guest mode (sandboxed sample data)
### Performance gate
- [ ] LCP < 2.5s · CLS < 0.1 · INP < 200ms spot-check
- [ ] Route code-splitting + lazy-load charts/editors
- [ ] Firestore read pagination + indexes
- [ ] PWA install test on phone (desktop + mobile)
- [ ] **v1 release tag v1.0.0** 🎉

## 2. v1.5 Extras (flag-gated)
- [ ] News hub: RSS aggregate + TL;DR + save to notes
- [ ] Reading list (save for later → notes)
- [ ] AI chat (Groq streaming + Ollama local fallback)
- [ ] AI daily digest on dashboard
- [ ] AI study planner
- [ ] BADS-DE: iCal sync + drafts + risk pill + Google Calendar
- [ ] Habit tracker (streaks + AI nudges)
- [ ] File→text converter (PDF/DOCX/TXT/MD/CSV/XLSX/HTML)
- [ ] Obsidian format: export + vault import + wikilinks render
- [ ] Obsidian LIVE hybrid (Local REST API + MCP): Settings panel + Test Connection
- [ ] Obsidian LIVE hybrid: `lib/obsidian/client.ts` REST client (client-side)
- [ ] Obsidian LIVE hybrid: Push/Pull buttons + vault browser + confirm dialog
- [ ] Obsidian LIVE hybrid: MCP config-only (no agent) + cert-trust docs
- [ ] Semester planner (term grid)
- [ ] Custom dashboard grid (drag-resize widgets)
- [ ] AI OCR for scanned PDFs (after converter)

## 3. v2 Future (not scheduled)
- [ ] Android APK via Capacitor (same codebase)
- [ ] WebAuthn biometric unlock (Android)
- [ ] Push notifications
- [ ] Offline-first sync queue
- [ ] Note "publish to web" (Obsidian Publish alt)
- [ ] Optional one-time paid tier (reserved `plan` field)

## 4. Dropped / Revisit Later
- [x] ~~YT → MP4~~ — dropped (ToS + server cost). Documented in master.
- [ ] Quick capture / inbox note (not selected — could revisit)
- [ ] End-of-day review (not selected — could revisit)
- [ ] Backlinks graph panel (Obsidian — future option)
- [ ] Two-way live vault watch (Obsidian — future option)
