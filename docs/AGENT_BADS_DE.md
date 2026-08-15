# AGENT: BADS-DE (Student Assignment Engine) (Stxic) — v1.5, flag-gated

## Reference
"Blackboard Autonomous Deadline Sync & Drafting Engine" — adapted for
University of Mindanao Blackboard iCal feed.

## Ownership
- `lib/blackboard/` (ical, risk, drafts, sync) — FULL OWNERSHIP
- `app/tasks/` BADS-DE panel · `docs/badsde.md` (feed URL setup guide)

## Flow
```
[UM Blackboard iCal URL] → 1. fetch .ics (URL from settings, no creds)
→ 2. parse Event { uid, summary, description, dtstart, dtend, course }
→ 3. dedupe via uid in users/{uid}/blackboard
     ├─► mirror to users/{uid}/tasks (type=assignment)
     │     (Google Calendar OAuth2 mirror — DEFERRED)
     └─► if NEW → enqueue draft
→ 4. Draft: badsDraftPrompt(description) → markdown note in folder "Assignments"
→ 5. Tracker table (Course|Title|Due|Draft|Calendar) + risk pill
```

## Rules
- Poll 4x/day (6h) + "Sync now" button. 429 → exponential backoff; log
  `lastSync`. Idempotent re-runs.
- Truncated description → skeleton + `<details TBD>`.
- Calendar: Google OAuth2 refresh token stored encrypted in Firestore.
- Risk score 0–3 (due-soon + no-draft + missing steps) → Low/Med/High/Critical.
- Queue-based, mobile-friendly sync (APK-ready).

## Done
- Hand-rolled iCal parser (`lib/blackboard/ical.ts`) handles the real UM
  feed (folded lines, `\,` escaping, `TZID=Asia/Manila`). Unit-tested.
- Server route `/api/badsde/sync` fetches + parses the feed (CORS bypass);
  client `lib/blackboard/sync.ts` dedupes, mirrors future events to tasks
  (type=assignment), and auto-drafts notes into "Assignments".
- Risk pill (0–3 → Low/Med/High/Critical) rendered in the Tasks panel.
- Only events due today-or-later are imported (skips past gradebook items).

## Deferred
- Google Calendar OAuth2 mirror (needs a Google Cloud project + encrypted
  refresh-token storage).
- Recurring events / RRULE — not emitted by the current feed.
