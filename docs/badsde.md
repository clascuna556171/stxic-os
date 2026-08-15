# BADS-DE — UM Blackboard feed setup

BADS-DE syncs your University of Mindanao Blackboard deadlines into Stxic
Tasks (as `assignment` tasks) and auto-drafts a note skeleton for each new
one. It reads a **read-only iCal feed URL** — no Blackboard password is ever
stored or sent.

## 1. Get your iCal feed URL

1. Log in to <https://umindanao.blackboard.com>.
2. Open **Calendar** (the global calendar, not a single course).
3. Look for **Get External Link** / **Calendar Feed** (sometimes under the
   calendar's share/settings menu).
4. Copy the `.ics` URL. It looks like:

   ```
   https://umindanao.blackboard.com/webapps/calendar/calendarFeed/<token>/learn.ics
   ```

> Keep this URL private — anyone with it can read your deadlines.

## 2. Connect it in Stxic

1. Open **Tasks**.
2. In the **Blackboard** panel, paste the URL and press **Save**, then
   **Sync now**.

## 3. What happens

- Only items **due today or later** are imported (past gradebook entries are
  skipped so they don't flood your board).
- Each new deadline becomes an `assignment` task (priority P1).
- A draft note skeleton is generated into the **Assignments** folder.
- Re-sync is idempotent: already-imported items are never duplicated.

## Notes

- Sync is manual ("Sync now"); scheduled polling is not wired yet.
- The feed has no course names or descriptions, so tasks carry the item title
  and due date only, and drafts use the `<details TBD>` skeleton.
- Google Calendar mirroring is deferred (needs a Google Cloud project).
