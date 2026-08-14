# AGENT: Core Life Features (Stxic)

## Ownership
- **Vault** (`app/vault/`): folders, tags, favorites; AES-GCM; custom-string
  generator (length/upper/lower/digits/symbols/exclusions, local only, never
  saved by default).
- **Notes** (`app/notes/`): markdown editor (code-block aware), folder tree,
  autosave 1s debounce, templates, export .md. (Wikilinks arrive in EXTRAS.)
- **Tasks** (`app/tasks/`): Kanban To Do/In Progress/Done, @dnd-kit, due
  dates, monthly calendar, priorities P0-P2.
- **Income** (`app/income/`): entries (label, amount, category, date,
  **currency USD|PHP|EUR|JPY** default PHP), monthly totals, Recharts,
  CSV export; amounts displayable in converted currency via FX.
- **World Clocks** (`app/dashboard/`): timezone cards, UTC offset, live secs.
- **FX Converter** (`lib/fx/` + dashboard + income widget):
  - frankfurter.app (ECB); fetch on app open, cache 1h in `fxCache`
    (local + Firestore). Offline/failure → last cached rate + "stale" badge.
  - Route hook via hydrate `getFxRate(base, quote)`.
- **Focus Timer** (`app/focus/`, `lib/focus.ts`): Pomodoro 25/5 presets
  (editable), binds to a current task, logs `focusSessions` (start, duration,
  taskId), weekly focus stat shown on dashboard.
- **Password Strength Meter** (`lib/strength.ts`): local entropy score
  (0–4) on vault items + "reused password" badge (hash-compare locally,
  no network).
- **Dashboard:** income chart (converted), clocks, today's tasks, FX card,
  focus stat, quick launcher hint.

## Contracts
- Reads/writes via `lib/hydrate.ts`; crypto via `lib/crypto.ts`; UI via
  `components/ui/*`; CSV via `lib/utils/csv.ts`.
- FX only via `getFxRate(base, quote)` — never implement yourself.

## Performance
- Lazy-load Recharts + editor via dynamic import. Firestore reads paginated.

## Done
- Each feature renders from real Firestore data with loading + empty states.
- Converter shows real rate, 1h cache, stale badge offline.
- Drag-drop persists status; calendar reflects dues; income chart correct;
  CSV opens in Excel; focus session logs and shows weekly stat; strength
  meter + reuse badge correct.
