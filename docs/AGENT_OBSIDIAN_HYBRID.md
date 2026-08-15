# AGENT: Obsidian Hybrid Integration (Stxic) — v1.5, flag-gated (`obsidianLive`)

## What This Is
A **live two-way bridge** between Stxic and an Obsidian vault running on the
SAME machine as the browser, via the community plugin **"Local REST API with
MCP"** (coddingtonbear). This is the desktop live layer — DISTINCT from the
portable **Obsidian format compatibility** (export/import `.md`, wikilinks) in
`AGENT_EXTRAS.md`. Keep both: format-compat serves mobile/other machines; this
hybrid serves the user's own desktop where Obsidian is open.

## Ownership
- `lib/obsidian/client.ts` (REST client) — FULL OWNERSHIP
- `lib/obsidian/sync.ts` (push/pull mapping + conflict guard)
- `app/settings/` Obsidian panel · vault browser widget in notes app
- Settings schema lives in AUTH (`settings.obsidian`); all writes via
  `lib/hydrate.ts`; UI via `components/ui/*`. No server-side calls —
  the Next.js server cannot reach the user's `127.0.0.1`.

## Plugin Reference (verified)
- **REST base (HTTPS):** `https://127.0.0.1:27124` (self-signed cert, generated
  on first run). **Insecure HTTP:** `http://127.0.0.1:27123` — off by default;
  enable at Obsidian → Settings → Local REST API → Enable HTTP server.
- **Endpoints:** `/vault/{path}` (GET PUT PATCH POST DELETE) · `/search/simple/`
  (POST, full-text) · `/tags/` (GET) · `/open/{path}` (POST) · `/` (GET,
  status/auth check, no auth) · `/mcp/` (GET POST — built-in MCP server,
  Streamable HTTP).
- **Auth:** every request needs `Authorization: Bearer <api-key>`. Key is per
  vault, shown in the plugin settings pane.
- **CORS:** plugin replies `Access-Control-Allow-Origin: *` — browser fetches
  from the web app pass. Loopback `127.0.0.1` is exempt from mixed-content
  blocking, so the insecure HTTP endpoint also works from an HTTPS page.
- `PUT /vault/{path}` overwrites; `PATCH /vault/{path}` appends to file end.
- Notes are returned as `NoteJson` `{ tags, frontmatter, stat, path, content }`.

## Connection Decision
- **Default: HTTPS (27124).** Self-signed cert must be trusted once on Windows:
  open `https://127.0.0.1:27124/obsidian-local-rest-api.crt` (or the site),
  install into **Trusted Root Certification Authorities**, restart browser.
- **Fallback: HTTP (27123)** — toggle in the Settings panel for when cert
  trust is too painful. Loopback HTTP is still Bearer-key protected.
- Both documented in the Settings panel with a short hint + "Test Connection".

## Security (mandatory)
- **NEVER commit or hardcode the API key.** It is entered in the Settings UI
  (password field, never logged) and stored ENCRYPTED in Firestore
  `settings.obsidian.encryptedKey` via AUTH's AES layer. Decrypt only
  client-side when calling Obsidian.
- The key is a secret from a pasted chat message — recommend the user
  regenerate it in Obsidian before the repo is made public.
- The user must acknowledge: "Obsidian must be running on this machine with
  the Local REST API plugin enabled" before enabling the toggle.

## Settings Panel (`app/settings/` Obsidian card)
- Toggle: **Enable Obsidian** (starts client; gates all UI below).
- Base URL (default `https://127.0.0.1:27124`).
- Protocol fallback toggle (HTTPS / HTTP-insecure).
- API key — password input, never shown in plain after save.
- **Test Connection** → `GET /`:
  - ok → green "Connected to Obsidian (vX.X.X)".
  - network/refused → "Obsidian must be running on this machine with the
    Local REST API plugin enabled."
  - cert error (HTTPS) → "Trust the self-signed certificate or enable HTTP
    mode (port 27123) in the plugin."
  - 401 → "API key incorrect — check Obsidian → Settings → Local REST API."
- **MCP config** section (read-only): shows `mcpUrl` = `{base}/mcp/` + masked
  key, and a **Copy MCP config** button that copies the JSON shown below —
  for future AI use only, do NOT build an agent now.

## `lib/obsidian/client.ts` (client-side)
```ts
export type ObsidianClient = {
  baseUrl: string;
  getStatus(): Promise<{ version?: string }>;
  listDirectory(path?: string): Promise<NoteInfo[]>;   // GET /vault/{path}/
  readNote(path: string): Promise<NoteJson>;            // GET /vault/{path}
  writeNote(path: string, content: string): Promise<void>;  // PUT (overwrite)
  appendNote(path: string, content: string): Promise<void>; // PATCH (append)
  deleteNote(path: string): Promise<void>;               // DELETE /vault/{path}
  search(query: string): Promise<SearchResult[]>;        // POST /search/simple/
};
```
- Always sends `Authorization: Bearer <key>`. Set `Content-Type` per call
  (`text/plain` for write/append, `application/json` for search).
- Return typed `{ ok, data?, error? }` envelopes (see FILE 8). Categorize
  errors: `connection-refused` / `cert-untrusted` / `unauthorized` /
  `not-found` / `rate` — map to the copy above.
- Never throws raw; never logs the key. Paths are URL-encoded.

## Push / Pull Mapping (`lib/obsidian/sync.ts`)
- **Push note** → vault path `Stxic/{folder?}/{slug}.md` where slug derives
  from note title. Prepend frontmatter:
  ```
  ---
  title: <title>
  stxic_id: <firestore-note-id>
  tags: [<note tags>]
  created: <ISO>
  ---
  ```
- **Pull note** → `readNote(path)`, parse frontmatter, find Firestore note by
  `stxic_id` (create new if missing), update content + tags.
- **Matching:** frontmatter `stxic_id` is the source of truth. Files under
  `Stxic/` without a matching id → offer "Import as new note".
- **Conflicts:** last-write-wins per direction, BUT show a confirm dialog
  listing files changed (old vs new first lines) before applying a pull that
  would overwrite locally-edited notes. Never auto-merge.
- Never push: empty titles, `.stxbak` backups, or other vault folders.

## Basic UI (in Notes app, only when enabled)
- **Vault browser** (drawer/dialog): `listDirectory()` tree → click to
  `readNote()` → view + edit (same markdown editor as Notes).
- Per note actions: **Save to Obsidian** (push current note),
  **Pull from Obsidian** (read vault copy into this note), plus an inline
  "Connected" / "Offline" pill.
- Empty states: no connection → the "Obsidian must be running" message.
- All operations show loading + error toast via `components/ui/Toast`.

## MCP (light — config only, no agent)
- Endpoint `{base}/mcp/` (e.g. `https://127.0.0.1:27124/mcp/`). Streamable
  HTTP; same Bearer auth.
- Copied config for future AI tools:
  ```json
  {
    "mcpServers": {
      "obsidian": {
        "type": "http",
        "url": "{base}/mcp/",
        "headers": { "Authorization": "Bearer <key>" }
      }
    }
  }
  ```
- Store `mcpUrl` + encrypted key in `settings.obsidian`. Mark "for future use —
  AI agent will consume this later (AGENT_AI)". Do NOT implement a client now.

## Contracts
- Settings (AUTH): `settings.obsidian = { enabled, baseUrl, insecure, encryptedKey, mcpUrl, lastConnectedAt }`.
- Feature flag `obsidianLive: false` (FILE 8). Hydrate getter/setter
  `getObsidianConfig()` / `saveObsidianConfig()` (encrypted key in/out).
- `sync.ts`: `pushNote(noteId)`, `pullNote(path)`, `listVault()`.

## Done
- Test Connection green against a live instance; push→pull round-trip creates
  matching notes; confirm dialog shows changes before overwrite; key stored
  encrypted, never logged; cert-untrusted + connection-refused copy shown
  correctly; build + lint pass.
- `lib/obsidian/client.ts` REST client (getStatus, listDirectory, readNote,
  writeNote, appendNote, deleteNote, search) with Bearer auth, encoded paths,
  and categorized errors (`connection-refused` / `unauthorized` /
  `not-found` / `rate` / `unknown`). Unit-tested against a stubbed fetch.
- Settings panel (`components/features/obsidian/obsidian-settings-card.tsx`):
  enable toggle, base URL, HTTP fallback, API-key password field, Test
  Connection, read-only MCP config with Copy button. Key persisted AES-GCM
  via `saveObsidianConfig`.
- Push/Pull (`lib/obsidian/sync.ts`) + vault browser
  (`components/features/obsidian/vault-browser.tsx`) wired into Notes:
  push to `Stxic/{folder}/{slug}.md`, pull with `stxic_id` matching + change
  confirm dialog, Connected/Offline pill, demo-mode disabled.
- Cert-trust + setup guide at `docs/OBSIDIAN_SETUP.md`. Vault graph widget on
  the dashboard (`components/features/obsidian/obsidian-graph.tsx`).
- Feature flags `obsidian` + `obsidianLive` → `true`.
