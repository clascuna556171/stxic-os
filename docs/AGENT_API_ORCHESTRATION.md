# AGENT: API Routing & Orchestration (Stxic)

## Ownership
- `/api/*` routes + Server Actions · `lib/hydrate.ts` (single read/write API
  for ALL agents) · `lib/config/features.ts` · `middleware.ts`

## Responsibilities
1. Middleware guard → redirect unsigned to `/(auth)/login`.
2. Route map (stubs now, wire as agents ship):
   - `POST /api/auth/verify-pin` (AUTH)
   - `POST /api/ai/chat` streaming (AI)
   - `GET  /api/news` · `GET /api/news/saved` (NEWS)
   - `POST /api/badsde/sync` · `POST /api/badsde/draft` (BADS-DE)
   - `GET  /api/fx/rate?base=USD&quote=PHP` (CORE, 1h cache)
   - `POST /api/focus/session` (CORE)
   - `POST /api/backup/export` · `POST /api/backup/restore` (BACKUP-DEMO)
   - `POST /api/convert/file` (EXTRAS, client-side fallback)
   - NO route for Obsidian — live sync is client-side only (the server cannot
     reach the user's `127.0.0.1`). See `AGENT_OBSIDIAN_HYBRID.md`.
3. `lib/hydrate.ts` typed getters/setters: vault, notes, tasks, income,
   habits, focusSessions, settings, news, blackboard, fx, backup,
   obsidianConfig (`getObsidianConfig()` / `saveObsidianConfig()`).
4. Feature flags: `{ auth, vault, notes, tasks, income, clocks, fx, presets,
   focus, backup, demo: true; news, habits, ai, badsde, convert, obsidian,
   obsidianLive, semesterPlanner, dashboardGrid, readingList, ocr: false }`.
5. Shared utils in `lib/utils/*` (dates, currency formatter, CSV, cn,
   debounce, throttle).

## Contract Discipline
- Cross-feature access ONLY via hydrate.ts. Consistent
  `{ ok, data?, error? }` envelopes. Maintain `docs/API.md`.

## Performance
- Routes idempotent (safe retry). FX + RSS cached + rate-limited.

## Done
- Middleware login redirect; hydrate exposes every collection; flags hide
  unfinished nav in dev+prod.
