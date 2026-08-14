# AGENT: Extras — Converter, Obsidian, Reading List, Semester Planner,
Dashboard Grid, OCR (later) — v1.5, flag-gated

## A. File → Text Converter (`app/convert/`, `lib/converter/`) — CLIENT-SIDE
- Formats: **PDF, DOCX, TXT, MD, CSV, XLSX, HTML** (≥ these — not PDF-only).
- Web Workers (UI never blocks). Libs: pdf.js, mammoth, xlsx, papaparse.
  No server upload → data stays local.
- Output: clean text preview → "Save as note" (folder "Converted"), copy,
  download .txt/.md. Size guard + progress bar; drag & drop + file picker.
- Scanned PDF (no text layer) → "no text found" hint (OCR is later).

## B. Obsidian Format Compatibility (`lib/obsidian/`) — FORMAT, no embed
Obsidian is a separate local app; we support its FORMAT, we don't embed it.
This is the PORTABLE layer (mobile / other machines). The LIVE desktop
two-way bridge is a separate feature — see `AGENT_OBSIDIAN_HYBRID.md`.
- **Export:** any Stxic note/folder → Obsidian-compatible `.md`
  (frontmatter `title/tags/created`, `[[wikilinks]]`, `#tags`, `/` folders).
- **Import:** upload Obsidian vault (zip / folder of .md) → recreate structure
  in `notes/`, preserving `[[wikilinks]]` + `#tags`.
- **Authoring:** render `[[wikilinks]]` as clickable chips, `#tags` as pills;
  link target = another note title (backlinks panel = documented future).
- NOTE: `lib/obsidian/` is shared — `client.ts` + `sync.ts` belong to the
  HYBRID agent (live REST), format helpers live here. Do not cross-write.

## C. Reading List (`lib/news/readingList.ts`)
- "Save for later" queue in news; item → Notes when marked read.

## D. Semester Planner (`app/planner/`)
- Term grid mapping BADS-DE assignments + self tasks onto weeks; AI
  study-planner fills free gaps (studyPlannerPrompt). Depends on hydrate
  tasks + BADS-DE events.

## E. Custom Dashboard Grid (`components/features/dashboard/`)
- Drag-resize widgets (clocks, chart, habits, digest, focus) like macOS
  widgets; layout persisted to settings.

## F. AI OCR — LATER (reserved)
- For scanned PDFs flagged in converter: OCR via Groq (`ocrExtractPrompt`).
  Do not implement until converter ships + AI agent exposes OCR route.

## Contracts
- `convertText(file): Promise<TextResult>` · `saveConverted(text, name)`
- `exportNoteAsObsidian(noteId)` · `importObsidianVault(files)`
- Uses `lib/hydrate.ts`; all flag-gated.

## Done
- ≥6 formats convert in a worker (progress + size guard); output saves as a
  note; note→md→import round-trip works; `[[links]]`+`#tags` render; reading
  list + semester planner + dashboard grid functional behind flags.
