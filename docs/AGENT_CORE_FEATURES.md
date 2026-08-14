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
- Vault: folder/tag/favorite filters, search, add/edit dialog, delete confirm,
  local password generator (length 8–64, sets, exclusions), strength meter
  (`lib/strength`), reused-password badges (`lib/vault`, SHA-256 local).
- Notes: folder tree + list, markdown editor (textarea + lazy react-markdown
  preview/split), 1s debounced autosave with saved indicator, built-in
  templates, `.md` export.
- Tasks: Kanban To Do/In Progress/Done with @dnd-kit drag between columns
  (persists status), P0–P2 badges, month calendar with per-day pills + overdue.
- Income: multi-currency entries, per-currency summary, monthly Recharts chart
  (lazy), CSV export, FX converter card.
- FX: `/api/fx/rate` (frankfurter, 1h Firestore cache), `lib/fx` client with
  stale flag, converter on dashboard + income.
- World clocks: live timezone cards (UTC offset + seconds), add/remove,
  persisted to `settings.clocks`.
- Focus: Pomodoro 25/5/15 (editable), binds to a task, logs `focusSessions`,
  weekly stat on dashboard + focus page.
- Dashboard: today's tasks, weekly focus stat, clocks, FX converter, income
  chart, ⌘K quick-launcher hint — each with loading/empty states.
