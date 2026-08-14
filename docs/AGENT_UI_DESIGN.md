# AGENT: UI Design System (Stxic)

> CRAFT RULE: This file defines the design system + tokens. HOW to execute
> (anti-slop rules, dials, motion, a11y, full interactive states) is
> enforced by `AGENT_UI_SKILL.md` — read it before every UI task.

## Ownership
- `components/ui/` primitives · `styles/globals.css` tokens · Tailwind config
- `components/layout/` (Sidebar, Topbar, Command Palette)
- `lib/theme.ts` preset registry — FULL OWNERSHIP
- Framer Motion presets · `public/manifest.webmanifest` + icons + SW (v1 must)

## Design Direction — "SpaceX meets macOS"
- Dark base `#0A0A0A`; light base `#F7F7F8`; cards +1 step; 1px borders
  `rgba(0,0,0,0.08)` (light) / `rgba(255,255,255,0.06)` (dark).
- Inter UI, JetBrains Mono for code/numbers, fluid type scale.
- Glassmorphism only on overlays/modals; flat crisp cards.
- Micro-interactions 120–200ms ease-out; page intros fade+rise.
- ⌘K / Ctrl+K command palette (`fuzzysort`) over tasks/notes/passwords
  (labels only)/news/habits/focus.
- **Settings page hosts the Obsidian panel** (HYBRID agent): toggle, baseUrl,
  protocol fallback, password-field API key, "Test Connection", MCP config
  copy — all using primitives/tokens from this system.

## Theme Presets (CORE) + Dark/Light
- `presets/` = { name, accent, surface, radius, font }: **Stxc** (cyan),
  **Mars** (orange), **Midnight** (indigo), **Mono** (monochrome).
- CSS custom properties; switching = toggling a `data-theme` attribute
  (dark/light) + `data-preset` — instant, no reload.
- **Accent picker:** hue slider → live preview → saved to settings
  `{ themePreset, accent, theme }`. Default: cyan `#00D4FF`; alt orange
  `#FF6B35`.
- Every primitive consumes tokens — no hardcoded colors in components.

## Performance
- Preset/theme switch is CSS-var only (no page re-render). Lazy-load fonts;
  no heavy assets; CSS transforms for animation.

## Primitives (stable API)
- Button, Input, Textarea, Select, Switch, Modal (portal), Tooltip, Toast,
  Badge/Pill, Card, EmptyState, Skeleton, ProgressRing, Tabs, Kbd,
  CommandPalette. All: tailwind-merge + cva variants.

## Tokens
- `--bg --surface --surface-2 --border --text --text-muted --accent
  --accent-hover --danger --success --warning` (+ `[data-theme=light]`).
- Responsive from start (sidebar → bottom nav/drawer on mobile) for APK.
- Provide manifest + theme-color meta + SW registration for PWA install.

## Done
- Primitives exported from `components/ui/index.ts` (Button, Input, Textarea,
  Label, Card, Badge, Skeleton, EmptyState, Kbd, ProgressRing, Dialog, Tooltip,
  Toast, Switch, Select, Tabs) — cva + tailwind-merge, Radix for a11y-critical
  ones.
- Design tokens dark (`#0A0A0A`) + light (`#F7F7F8`) in `styles/globals.css`;
  Tailwind v4 `@theme` mapping; Inter + JetBrains Mono via `next/font`.
- Preset registry (Stxc, Mars, Midnight, Mono) + accent picker + dark/light
  toggle live-update via CSS vars (`lib/theme.ts`, `ThemeProvider`).
- Command palette (⌘K/Ctrl+K) over nav + actions with `fuzzysort`.
- Layout shell (Sidebar/Topbar/mobile bottom-nav) + login/PIN/dashboard/
  settings pages wired to the auth + hydrate layers.
- PWA: `manifest.webmanifest` + generated icons + manual service worker
  (`public/sw.js`). Note: `@serwist/next` was reverted — it injects a `webpack`
  config that conflicts with Next 16's Turbopack default build. Migrate to
  `@serwist/turbopack` (or configurator mode) once it's stable for precaching.
