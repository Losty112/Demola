# Benchmark Hospital

A comparable view of every hospital site against a benchmark hospital, so hospital directors see the real need before a decision about a site's role is made. Prototype with illustrative demo data.

**Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Recharts, Supabase (Postgres).

## Set up

1. **Supabase:** create a project, open *SQL Editor* and run, in this order,
   `supabase/migrations/20261026000000_init.sql` (schema) and `supabase/seed.sql` (illustrative Prague data: 9 hospitals × 12 quarters plus departments, monthly activity, operating rooms, cost split and patient catchment). Both are safe to re-run; `seed.sql` resets the data to the demo set.
2. **Keys:** *Project Settings → API* → copy the project URL and the `service_role` key into `.env.local` (see `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. The key is server-only; row level security is on with no policies, so the public anon key can read nothing.
3. **Run:**

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # domain logic + dataset consistency tests
```

## Deploy on Vercel

Import the repo at vercel.com/new, then add the Supabase integration (Storage → Supabase) or set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under *Settings → Environment Variables*. Redeploy. Data lives in Supabase, so saved sites persist.

## Data

- `npm run db:sql` regenerates `supabase/seed.sql` from `lib/demo/generate.ts` (deterministic; edit the site profiles there to change the demo network).
- `npm run db:seed` loads the same data through the API instead (needs the keys in `.env.local`).
- Detail tables reconcile with the quarterly snapshot: department beds add up to the site's beds, monthly bed-days to the quarter's occupancy, cost categories to facility cost × floor area.

## Loading real data

1. Fill `data/import-template.csv` — one row per site and quarter.
2. `npm run db:import -- yourfile.csv --replace` (`--replace` removes the demo sites and their detail data).
3. Edit benchmark values and decision thresholds in the `benchmark_values` and `settings` tables (Supabase *Table Editor*).

The app is one page (`/`) with four sections: overview, site analysis, compare, benchmark & data. The old `/compare`, `/data` and `/sites/*` URLs redirect to it.

JSON endpoints: `/api/sites`, `/api/sites/[slug]`, `/api/sites/[slug]/stats`, `/api/benchmark`.

## Layout

- `lib/domain/` — pure scoring, scenarios and recommendation logic (shared by server and browser)
- `lib/db/` — Supabase client and repository; `lib/demo/` — synthetic dataset generator; `supabase/` — schema and seed SQL
- `app/` — pages and API routes; `components/` — UI and charts
- `scripts/` — seed, SQL generation and CSV import; `tests/` — unit tests

> Next.js 16 has breaking changes vs. older versions (async `params`/`searchParams`, request-time rendering rules); see `AGENTS.md`.
