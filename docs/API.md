# Stxic API — Routes & Contract

> Owner: AGENT API_ORCHESTRATION. Keep this file updated whenever a route or
> envelope changes. All routes return the `Envelope` shape below.

## Envelope Contract

Every hydrate call, server action, and API route returns one of:

```ts
type Envelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

- Errors are human-readable strings (do not leak stack traces).
- HTTP status codes: `200` success · `401` unauthenticated · `501` stub.

## Auth

Auth flows run through **server actions** in `lib/auth/actions.ts`
(`establishSession`, `endSession`, `setPin`, `verifyPin`,
`saveMasterPassword`) rather than REST routes. The session lives in the
httpOnly cookie `stxic_session`.

| Action | Input | Output |
| --- | --- | --- |
| `establishSession` | Firebase ID token | `{ uid, email }` |
| `endSession` | — | `null` |
| `setPin` | `{ pinSalt, pinHash, wrappedDekPin }` | `null` |
| `verifyPin` | raw PIN | `{ pinSalt, wrappedDekPin }` |
| `saveMasterPassword` | `{ encKeySalt, wrappedDekMaster }` | `null` |

## HTTP Routes

| Method | Route | Owner agent | Status |
| --- | --- | --- | --- |
| POST | `/api/auth/verify-pin` | AUTH | stub → use `verifyPin` action |
| POST | `/api/ai/chat` | AI | stub (SSE when shipped) |
| GET | `/api/news` | NEWS | stub |
| GET | `/api/news/saved` | NEWS | stub |
| POST | `/api/badsde/sync` | BADS-DE | stub |
| POST | `/api/badsde/draft` | BADS-DE | stub |
| GET | `/api/fx/rate?base=USD&quote=PHP` | CORE | live (1h cache) |
| POST | `/api/focus/session` | CORE | stub → use `saveFocusSession` (client-side encrypted) |
| POST | `/api/backup/export` | BACKUP | stub |
| POST | `/api/backup/restore` | BACKUP | stub |
| POST | `/api/convert/file` | EXTRAS | stub (client-side fallback) |

> **Obsidian has NO server route** — live sync is client-side only
> (`lib/obsidian/client.ts`), because the Next.js server cannot reach the
> user's `127.0.0.1`. See `AGENT_OBSIDIAN_HYBRID.md`.

## Data Access

Feature code never talks to Firestore directly. Use `lib/hydrate.ts`, which
returns `Envelope<T>` and encrypts/decrypts per collection. Encrypted
collections return `{ ok: false, error: "Session locked" }` when the app is
locked (no in-memory DEK).

## Feature Flags

`lib/config/features.ts` exposes `isEnabled(key)`. Non-core surfaces must
gate their nav + routes behind a flag.

## Proxy (login guard)

`proxy.ts` (Next 16 — `middleware` was renamed) redirects unsigned visitors
to `/login`. It is a UX convenience only: authorization is enforced by the
Firestore rules (own-uid) and inside each route/action.
