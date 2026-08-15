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

## D. Semester Planner (`app/semester/`)
- Term grid mapping BADS-DE assignments + self tasks onto weeks; AI
  study-planner fills free gaps (studyPlannerPrompt). Depends on hydrate
  tasks + BADS-DE events.
- Shipped: 16-week Monday grid, per-week "Plan week" (AI), links to /study.

## E. Custom Dashboard Grid (`components/features/dashboard/`)
- Freeform drag-resize widgets (digest, tasks, focus, clocks, fx, income,
  habits) on a 12-column grid; layout persisted to settings
  (`settings.dashboard.widgets`). Drag via grip handle, resize via the
  bottom-right corner, hide/restore via the "Add widget" menu. Shipped.

## F. AI OCR — LATER (reserved)
- For scanned PDFs flagged in converter: OCR via Groq (`ocrExtractPrompt`).
  Do not implement until converter ships + AI agent exposes OCR route.

## Contracts
- `convertText(file): Promise<TextResult>` · `saveConverted(text, name)`
- `exportNoteAsObsidian(noteId)` · `importObsidianVault(files)`
- Uses `lib/hydrate.ts`; all flag-gated.

## Done
- File→text converter (`/convert`): ≥6 formats convert client-side via
  dynamic-imported parsers (pdfjs-dist, mammoth, exceljs, papaparse) with a
  25 MB size guard; output saves as a note in "Converted", copy, or
  download .txt/.md. Scanned-PDF "no text" hint shown.
- Obsidian format compatibility (`lib/obsidian/format.ts`): export any note
  to Obsidian `.md` (frontmatter `title/tags/created/stxic_id`,
  `[[wikilinks]]`, `#tags`); import a vault folder (webkitdirectory) or `.md`
  files → notes (folders preserved); `[[wikilinks]]` render as clickable chips
  and `#tags` as pills in the markdown preview.
- AI OCR for scanned PDFs (`lib/converter/ocr.ts` + `app/api/ocr`): when a PDF
  yields no text, the converter shows "Run OCR" — renders up to 20 pages to
  JPEG and extracts text via Groq vision (`GROQ_VISION_MODEL`). Result saves
  as a note like any conversion.
- Remaining (reading-list edge cases) still pending behind flags.
