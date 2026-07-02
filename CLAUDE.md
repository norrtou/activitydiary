# Activity Diary — notes for Claude Code

Bilingual (EN/SV) local-first activity diary for occupational therapy.
Live at https://norrtou.github.io/activitydiary/ — deployed by
`.github/workflows/deploy.yml` on every push to `main`.

## Commands

- `npm run dev` — dev server
- `npm test` — Vitest (time math, i18n completeness, export, stats)
- `npm run build` — typecheck + production build (base `/activitydiary/`)

## Architecture

- **Data:** IndexedDB via Dexie (`src/lib/db.ts`), reactive reads with
  `useLiveQuery`. Entries store minutes-from-midnight (`startMin`/`endMin`)
  and never cross midnight — `splitOverMidnight` in `src/lib/time.ts` splits
  them on save. Settings live in localStorage (`src/lib/settings.ts`).
- **i18n:** typed dictionaries `src/i18n/en.ts` (source of truth) and
  `sv.ts` (`Record<MessageKey, string>` — missing keys are compile errors).
  Every user-visible string MUST go through `t()`; add keys to BOTH files.
- **Colors:** categories reference validated swatches in `src/lib/palette.ts`
  (8 fixed slots, separate light/dark steps). Never invent new data colors —
  the set + ordering was validated with the dataviz palette validator.
- **Routing:** HashRouter (GitHub Pages friendly). The `/report` route
  renders outside the app chrome for printing.
- **Charts:** Recharts, lazy-loaded via the Insights route; the activity
  clock is hand-rolled SVG (`src/components/charts/ActivityClock.tsx`).

## Conventions

- Keep advanced options inside Settings — the everyday flow stays minimal.
- Accessibility is a requirement: 44px touch targets, aria-labels on icon
  buttons, native `<dialog>` for sheets, focus-visible outlines.
- All diary data stays on-device; never add network calls for user data.
