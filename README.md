# Activity Diary · Aktivitetsdagboken

**A free, private activity diary for seeing how your days are really spent.**
Built for occupational therapy: log everyday activities (sleep, work, social
life, chores, exercise, fun…) and see the balance — visually and in numbers.

**➡️ Use it now: https://norrtou.github.io/activitydiary/** — nothing to
install, works on phone and computer, in **English and Swedish**.

*Ett kostnadsfritt, privat verktyg för att registrera vardagens aktiviteter
och se aktivitetsbalansen i diagram och siffror. På svenska och engelska.
All data stannar på din enhet.*

## Features

- **Today** — a visual 24-hour timeline: tap or drag to register activities.
  Each activity can optionally record a name, an energy rating (−2 draining …
  +2 energising), a mood rating (1–5) and a note.
- **Week** — a color overview of the whole week at a glance.
- **Insights** — occupational balance donut, a 24-hour *activity clock*,
  hours per category day by day, energy & mood trends, and everything in
  plain numbers too.
- **Export** — CSV for spreadsheets, JSON backup (restorable on another
  device — also how a client shares their diary with their therapist), and a
  print-friendly report for saving as PDF.
- **Private by design** — all data lives in your browser (IndexedDB).
  No account, no server, nothing is ever uploaded.
- **Installable** — works offline as a PWA; add it to your home screen.
- Custom categories, light/dark theme, and other options live in Settings so
  the everyday flow stays simple. Try it instantly with sample data
  (Settings → *Try with sample data*).

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # production build (deployed by GitHub Actions)
```

Stack: Vite + React + TypeScript, Dexie (IndexedDB), Recharts, custom typed
i18n (see `src/i18n/`). Pushing to `main` deploys to GitHub Pages via
`.github/workflows/deploy.yml`.

## License

Free to use. Data belongs to the person who registered it — always.
