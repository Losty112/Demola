# Benchmark Hospital

A comparable view of every hospital site against a benchmark hospital, so hospital directors see the real need before a decision about a site's role is made. Prototype with illustrative demo data.

**Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Recharts, SQLite (better-sqlite3).

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # domain-logic unit tests
```

A SQLite database (`data/benchmark.db`) is created and filled with demo data on first start. `npm run db:seed` resets it.

## Loading real data

1. Fill `data/import-template.csv` — one row per site and quarter.
2. `npm run db:import -- yourfile.csv --replace` (`--replace` removes the demo sites).
3. Edit benchmark values and decision thresholds in the `benchmark_values` and `settings` tables.

The app is one page (`/`) with four sections: overview, site analysis, compare, benchmark & data. The old `/compare`, `/data` and `/sites/*` URLs redirect to it.

JSON endpoints: `/api/sites`, `/api/sites/[slug]`, `/api/benchmark`.

## Layout

- `lib/domain/` — pure scoring, scenarios and recommendation logic (shared by server and browser)
- `lib/db/` — schema, client, demo seed, repository
- `app/` — pages and API routes; `components/` — UI and charts
- `scripts/` — seed and CSV import; `tests/` — unit tests

> Next.js 16 has breaking changes vs. older versions (async `params`/`searchParams`, request-time rendering rules); see `AGENTS.md`.
