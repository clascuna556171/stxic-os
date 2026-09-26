# Stxic — Master Project Context (v1.5)

## Mission
Stxic is a privacy-first, open-source **Personal Life OS** for students and
developers. It merges KeepR's life-management features (vault, notes, tasks,
finance — income, expenses, accounts & savings, world clocks) with a
Blackboard student automation engine (BADS-DE),
a curated X/Twitter AI/tech news hub, local + cloud AI (Groq + Ollama/Qwen),
AI daily digests, a USD→PHP converter, UI presets (dark/light), PWA install,
and encrypted backups. One codebase → web now, Android APK in a future update.

## Core Principles
- ZERO cost to run (free tiers only).
- Open-source free core; optional one-time paid tier is a FUTURE idea — no
  payment code is built in v1.
- Encrypted cloud storage (Firebase) with local-first behavior.
- **Optimize = app performance**: Core Web Vitals + lean bundles + smart reads.
- Dark + light themes, minimal "SpaceX meets macOS" aesthetic, fully
  re-skinnable via presets + accent picker.
- **UI craft floor:** ALL UI work must follow the design conventions in
  `CONTRIBUTING.md` — full interactive states, reduced-motion, WCAG AA, and
  the Core Web Vitals budget.

## Tech Stack (FIXED)
- **Frontend:** Next.js 14+ (App Router), React 18/19, TypeScript
- **Styling:** Tailwind CSS, CSS variables, Framer Motion
- **Backend:** Next.js API Routes + Server Actions
- **DB/Auth:** Firebase (Firestore + Firebase Auth, email/password + PIN)
- **AI Cloud:** Groq API (free tier) · **AI Local:** Ollama + Qwen2.5-Coder 1.5B
- **News:** RSS only (Nitter/RSS.app/blogs) — never paid APIs
- **FX:** frankfurter.app (ECB) — free, no key
- **File conversion (extras):** client-side only, Web Workers
- **Calendar:** Google Calendar API (OAuth2, BADS-DE sync)
- **PWA:** manifest + service worker (v1 must; enables future APK)

## Roadmap Tiers
- **🟢 v1 — Core:** auth/PIN · vault · notes · tasks/calendar · finance
  (income + expenses, accounts, savings goals) · world clocks · dashboard ·
  FX converter · UI presets +
  accent picker + dark/light toggle · command palette · PWA install ·
  encrypted backup (.stxbak) · demo/guest mode · password strength meter ·
  focus timer · performance budget.
- **🟡 v1.5 — Extras (flag-gated):** X/Twitter news hub · AI chat/digest/
  study planner · BADS-DE · habit tracker · file→text converter (client-side) ·
  Obsidian format import/export (portable) **+ Obsidian LIVE hybrid sync
  (desktop, Local REST API + MCP plugin)** · reading list · semester planner ·
  custom dashboard grid · AI OCR (later).
- **⚫ v2 — Future (not now):** Android APK via Capacitor (same codebase).
  HTTPS required for WebCrypto on Android; biometric unlock + push later.
- **Dropped:** "YT → MP4" (violates YouTube ToS, needs server + ffmpeg cost).

## Performance Budget (enforced)
- LCP < 2.5s · CLS < 0.1 · INP < 200ms on low-mid hardware.
- Route-level code splitting + lazy-load heavy deps (charts, editors, pdf.js)
  via dynamic import.
- Firestore: paginated/limited reads, indexes, no unbounded scans.
- No heavy images/videos in UI; animate with CSS transforms only.

## File Structure
```
stxic/
├── app/(auth)/login | dashboard | vault | notes | tasks | income | news
│         | habits | ai | convert | focus | backup | demo | settings
├── components/{ui, layout, features}
├── lib/{firebase, ai, news, blackboard, fx, converter, obsidian,
│         backup, theme, utils}
├── types/  docs/  styles/
└── public/  (manifest.webmanifest, icons, sw.js)
```

## Global Conventions
- TypeScript strict. `"use client"` only for interactivity.
- Secrets via `process.env.*`. AI prompts centralized in `lib/ai/prompts.ts`.
- Feature flags in `lib/config/features.ts` (every non-core surface gated).
- PWA-compatible from the start (manifest + service worker).

## Cross-Agent Boundaries (do not touch)
- `lib/firebase/` → AUTH · `lib/ai/prompts.ts` → AI · `lib/blackboard/` →
  BADS-DE · `lib/news/` → NEWS · `components/ui/`+`styles/` tokens →
  UI-DESIGN · `lib/fx/` → CORE · `lib/obsidian/client.ts`+`sync.ts` → HYBRID ·
  `lib/obsidian/` format helpers + `lib/converter/` → EXTRAS ·
  `lib/backup/` + `app/demo/` → BACKUP-DEMO.
- Cross-feature data flows ONLY through `lib/hydrate.ts` (see FILE 8).
