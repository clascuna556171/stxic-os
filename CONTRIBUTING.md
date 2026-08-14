# Contributing to Stxic

Thanks for your interest in contributing. Stxic is a privacy-first, open-source
Personal Life OS. This file covers the ground rules; the source of truth for
architecture and boundaries is in `docs/`.

## Start here

1. Read [`docs/PROJECT_CONTEXT_MASTER.md`](docs/PROJECT_CONTEXT_MASTER.md) —
   the mission, fixed tech stack, and conventions.
2. Read [`docs/ROADMAP.md`](docs/ROADMAP.md) — what's planned, in progress, and
   deliberately dropped.
3. Pick an unchecked item (or file an issue) and mention it in your PR.

## Code conventions

- **TypeScript strict.** `"use client"` only for interactivity.
- **Secrets** via `process.env.*` — never commit keys. See `.env.example`.
- **AI prompts** are centralized in `lib/ai/prompts.ts`.
- **Feature flags** live in `lib/config/features.ts` — every non-core surface is
  gated.
- **Cross-feature data flows only through `lib/hydrate.ts`.** Respect the
  cross-agent ownership boundaries listed in the master context.

## UI craft

All UI work must follow [`docs/AGENT_UI_SKILL.md`](docs/AGENT_UI_SKILL.md)
(adapted from `impeccable` + `taste-skill`): anti-slop rules, the locked design
dials, WCAG AA contrast, reduced-motion safety, and full interactive states
(loading / empty / error / active).

## Before you submit

```bash
npm run typecheck
npm run lint
npm run format:check
```

## License

By contributing, you agree your work is licensed under the project's MIT license.
