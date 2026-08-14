# AGENT: UI Craft Skill (Stxic) — "Operate mode, not slop"

> Adapted for Stxic from **impeccable** (pbakaus/impeccable — 23 design
> commands, 59 anti-pattern detector rules) and **taste-skill**
> (Leonxlnx/taste-skill — anti-slop frontend skill). Read both as primary
> references when in doubt:
> - https://github.com/pbakaus/impeccable
> - https://github.com/Leonxlnx/taste-skill
> This file is the Stxic-specific floor: the aesthetic is already committed
> (see AGENT_UI_DESIGN.md). This skill governs HOW to execute it.

## 0. Design Read First (taste-skill 0)
Before touching code, state the read in one line:
- **Surface kind:** Stxic is a PRODUCT/dashboard (impeccable *Operate* mode):
  the user completes a task. Scanability, consistency, and the real usage
  scene outrank expression. Brand lives in precise details, not decoration.
- **Audience:** a student/developer on low-mid hardware. No megatron
  marketing heroes, no landing-page tropes.
- **Locked language:** "SpaceX meets macOS" — dark `#0A0A0A`, flat crisp
  cards, 1px hairlines, glass only on overlays, Inter + JetBrains Mono,
  cyan `#00D4FF` accent (default) or preset/accent-picker override.
- Do NOT ask for design direction — it is decided. Just declare the read
  and execute.

## 1. The Three Dials (taste-skill 1) — Stxic lock
- `DESIGN_VARIANCE: 4` (asymmetric where data warrants, never chaos —
  this is an Operate surface, not a portfolio).
- `MOTION_INTENSITY: 4` (purposeful micro-motion only: hierarchy, feedback,
  state change. No scroll-jack, no endless loops, no parallax).
- `VISUAL_DENSITY: 6` (an app shell — tight but breathable. Mono numerals
  for data in dense zones).
Rules referenced below always respect these dials.

## 2. Anti-Slop Rules (impeccable anti-patterns + taste-skill AI tells)
- **No Inter-for-everything laziness → actually fine here**: Inter IS the
  committed Stxic brand font. JetBrains Mono for code/numbers. Don't swap
  fonts per-feature.
- **No purple-to-blue gradients.** Stxic accent = cyan. Gradient text for
  headers is banned. No "AI glow" on buttons.
- **No gray text on colored backgrounds**, no cards nested in cards.
- **No pure black / pure white** — always tint. Dark `#0A0A0A`, light
  `#F7F7F8` (never `#000`/`#fff`).
- **No bounce/elastic easing** (`easeOutBack`). Use 120–200ms
  `cubic-bezier(0.16, 1, 0.3, 1)` ease-out.
- **Cards only when elevation = hierarchy.** Otherwise `border-t`/`divide-y`
  or whitespace. Dashboard widgets are flat panels, not nested card piles.
- **One accent per page.** No teal status in the middle of a cyan layout —
  danger/success/warning are token exceptions, everything else stays on the
  accent. Lock it and audit.
- **One radius scale.** Token-driven (`--radius`); Stxc preset ~8-12px
  cards, pill buttons. Don't mix sharp cards with pill buttons.
- **No em-dash spam**, no fake-precise numbers, no cute AI copy. English
  only, functional copy.
- **No custom cursors, no dark neon glows, no over-used serif emphasis.**
  Emphasize with weight/italic of the SAME family.
- **No `<h1>` shouting** — hierarchy via weight + size tokens, not scale.

## 3. Typography (impeccable 4.1 + taste-skill 4.1)
- Fluid type scale from tokens; display `tracking-tighter leading-none`;
  body `max-w-[65ch]` only for prose (notes), not UI.
- **Italic descender clearance:** any italic display word with
  `y g j p q` needs `leading-[1.1]` minimum + `pb-1` reserve.
- Buttons/CTAs: text fits on ONE line at desktop; shorten label, never wrap.
- Numbers/data in JetBrains Mono in dense surfaces.

## 4. Color Calibration (taste-skill 4.2 + Stxic tokens)
- Use only `styles/` tokens: `--bg --surface --surface-2 --border --text
  --text-muted --accent --accent-hover --danger --success --warning`.
- Saturation < 80%; max 1 accent (the user's accent picker).
- **Theme lock:** page theme = `data-theme` (dark/light). Sections do NOT
  invert mid-page. Presets switch via `data-preset` only.
- **Contrast:** WCAG AA min (4.5:1 body, 3:1 large). Audit every button:
  no white-on-white, no ghost-on-photo without scrim. Form placeholders,
  focus rings, error text all AA.

## 5. Layout (impeccable 4.3/4.7 + Stxic)
- **Grid over flex-math.** `grid grid-cols-1 md:grid-cols-3 gap-*`, never
  `w-[calc(33%-1rem)]`.
- **Viewport stability:** `min-h-[100dvh]` for full-height surfaces, never
  `h-screen`.
- Sidebar → bottom nav/drawer on mobile (<768px), explicit per-surface
  collapse in the same component.
- No z-index spam: systemic scale only (sticky, modal, palette, toasts),
  documented in a constants file.
- Dashboard widgets: real hierarchy — clocks + FX card + tasks + chart +
  focus stat, laid out deliberately, not 6 identical cards.

## 6. Interactive States (taste-skill 4.5 — mandatory full cycles)
- **Loading:** skeletal loaders matching final layout. No generic spinners
  as default.
- **Empty states:** composed, tells user how to populate.
- **Errors:** inline (forms) / toast (transient).
- **Tactile:** `:active` → `translate-y-[1px]` or `scale-[0.98]`.
- **Forms:** label ABOVE input, error BELOW input, `gap-2` blocks. Never
  placeholder-as-label.

## 7. Motion (impeccable/taste-skill 5 + Stxic)
- Animate ONLY `transform` and `opacity`. Never `top/left/width/height`.
- **MOTION MUST BE MOTIVATED:** hierarchy, feedback, state change. If you
  can't justify it in one sentence, drop it. Static is fine.
- **Reduced motion is mandatory:** honor `prefers-reduced-motion`
  (Motion `useReducedMotion()` / CSS `@media (prefers-reduced-motion)`).
- No `window.addEventListener("scroll")`, no `useState` for continuous
  values — use `useMotionValue`/`useTransform` (Framer Motion) or
  `useScroll`/IntersectionObserver.
- No marquee spam (max 1/page), no un-motivated infinite loops.

## 8. Performance & CWV (impeccable 6 + Stxic budget)
- LCP < 2.5s · CLS < 0.1 · INP < 200ms. Lazy-load charts/editors (dynamic
  import). `next/image` priority for above-fold assets (Stxic has few).
- Fonts via next/font, self-hosted, `display: swap`.
- Grain/noise only on `fixed pointer-events-none` pseudo-elements.
- Run Lighthouse before declaring a surface done.

## 9. Stxic Execution Checklist (apply per surface)
- [ ] Uses tokens only — no hardcoded colors/radii in components.
- [ ] Dark + light both look complete (never ship a mode you haven't seen).
- [ ] Loading / empty / error / active states present.
- [ ] One accent, one radius scale, one theme locked.
- [ ] Responsive <768px collapse explicit; sidebar→bottom-nav.
- [ ] AA contrast on buttons, forms, text.
- [ ] Motion justified + reduced-motion safe; CSS transforms only.
- [ ] Matches AGENT_UI_DESIGN.md primitives (Button, Modal, EmptyState,
      Skeleton, Toast…) — reuse, never rebuild.

## 10. Sources & Updates
- Keep this floor in sync with the upstream skills (impeccable detector
  rules + taste-skill dials change). When both drift, the Stxic brand
  tokens win for color/font; the skills win for craft discipline.
