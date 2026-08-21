# Stxic — Personal Life OS

A privacy-first, open-source **Personal Life OS** for students and developers.
Merges KeepR-style life management (vault, notes, tasks, income, world clocks)
with a Blackboard student automation engine (BADS-DE), a curated X/Twitter
AI/tech news hub, local + cloud AI (Groq + Ollama/Qwen), AI daily digests, a
USD→PHP converter, UI presets (dark/light), PWA install, and encrypted backups.
One codebase → web now, Android APK later.

> **Status:** planning complete, implementation beginning. See
> [`docs/ROADMAP.md`](docs/ROADMAP.md) for the checklist,
> [`docs/PROJECT_CONTEXT_MASTER.md`](docs/PROJECT_CONTEXT_MASTER.md) for the
> master context, and [`docs/ARCHITECTURE_CODE_TREE.md`](docs/ARCHITECTURE_CODE_TREE.md)
> for the master architecture and code tree diagrams.

## Tech Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript (strict)
- **Styling:** Tailwind CSS (CSS variables), Framer Motion
- **Backend:** Next.js API Routes + Server Actions
- **DB/Auth:** Firebase (Firestore + Firebase Auth, email/password + PIN)
- **AI Cloud:** Groq API (free tier) · **AI Local:** Ollama + Qwen2.5-Coder 1.5B
- **News:** RSS only · **FX:** frankfurter.app (ECB) — free, no key
- **PWA:** manifest + service worker

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

**Android APK:** the app ships as a thin Capacitor shell that loads the
deployed web app. See [`docs/BUILD_APK.md`](docs/BUILD_APK.md) for the full
step-by-step build guide.

## Scripts

| Command                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Start dev server                          |
| `npm run build`        | Production build                          |
| `npm run start`        | Serve production build                    |
| `npm run lint`         | ESLint                                    |
| `npm run format`       | Prettier (write)                          |
| `npm run format:check` | Prettier (check only)                     |
| `npm run typecheck`    | `tsc --noEmit`                            |
| `npm test`             | Vitest (crypto + utils unit tests)        |
| `npm run test:rules`   | Firestore rules tests (starts emulators)  |
| `npm run emulators`    | Start Firebase Auth + Firestore emulators |

## Local Development (zero cost)

Auth + Firestore run against local emulators (no Firebase project needed):

```bash
npm run emulators     # terminal 1 — starts Auth :9099 + Firestore :8080
npm run dev           # terminal 2 — the app
```

Copy `.env.example` → `.env.local` and set `NEXT_PUBLIC_FIREBASE_EMULATOR=true`.
When a real Firebase project is ready, set the `NEXT_PUBLIC_FIREBASE_*` values
and turn the flag off. Emulators need Java 17+ (`firebase-tools` pinned to
`^13`, since v14+ requires Java 21).

## Environment Variables

See [`.env.example`](.env.example) for the full `process.env` reference list.
Copy it to `.env.local` and fill in your keys.

## Project Structure

```
stxic/
├── app/                 # App Router routes
├── components/          # ui / layout / features (arrives in v1 Core)
├── lib/                 # firebase / ai / news / blackboard / fx / … (v1 Core)
├── types/               # shared types (v1 Core)
├── docs/                # planning docs + agent contracts
└── public/              # manifest, icons, sw.js
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). All non-core surfaces are gated behind
feature flags in `lib/config/features.ts`.

## License

[MIT](LICENSE)
