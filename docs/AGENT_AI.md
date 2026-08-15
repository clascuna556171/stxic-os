# AGENT: AI Integration (Stxic)

## Ownership
- `lib/ai/` (groq.ts, ollama.ts, router.ts, prompts.ts) — FULL OWNERSHIP
- `app/ai/` chat UI · digest in `lib/ai/digest.ts`

## Router
- Default `auto`: Ollama/Qwen2.5-Coder-1.5B first → Groq fallback.
  Single interface `chat(messages, opts) => Promise<string>`.
- Groq `llama-3.3-70b-versatile`; local `qwen2.5-coder:1.5b`.
- Env: `GROQ_API_KEY, GROQ_MODEL, OLLAMA_BASE_URL (http://localhost:11434),
  OLLAMA_MODEL`. Timeouts + graceful canned fallback (never crash UI).

## Prompts (centralized in prompts.ts)
1. `dailyDigestPrompt` → markdown briefing + JSON `top3Priorities`
2. `studyPlannerPrompt` → day-by-day study schedule
3. `focusNudgePrompt` → 1-sentence focus rec
4. `habitHypePrompt` → motivational nudge
5. `threadSubPrompt` → X/thread → bullet summary
6. `badsDraftPrompt` → assignment desc (may truncate) → draft skeleton
   (Title, Intro, Methodology checklist, References; `<details TBD>`)
7. `ocrExtractPrompt` (reserved, LATER) → scanned PDF text cleanup

## Constraints
- Never send passwords / decrypted vault content to models.
- Streaming via SSE or `POST /api/ai/chat`. Backend-agnostic router so a
  future android-local option is a thin addition.

## Done
- Groq streaming chat; local Ollama chat (README: `ollama serve` + model
  pull steps); digest JSON consumed by dashboard card.
