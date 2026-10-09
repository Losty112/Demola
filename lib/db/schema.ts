/**
 * SQLite schema. Everything the UI shows is derived from these tables, so loading real
 * data means writing rows here (see scripts/import-csv.ts) — no code changes needed.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  region     TEXT NOT NULL DEFAULT '',
  kind       TEXT NOT NULL DEFAULT 'Hospital',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id      INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,            -- e.g. 2026-Q3 (sorted lexicographically)
  beds         INTEGER NOT NULL CHECK (beds > 0),
  occupancy    REAL NOT NULL CHECK (occupancy BETWEEN 0 AND 100),
  area_per_bed REAL NOT NULL CHECK (area_per_bed > 0),
  cost_per_m2  REAL NOT NULL CHECK (cost_per_m2 > 0),
  or_util      REAL NOT NULL CHECK (or_util BETWEEN 0 AND 100),
  space_use    REAL NOT NULL CHECK (space_use BETWEEN 0 AND 100),
  energy       REAL NOT NULL CHECK (energy > 0),
  travel_time  REAL NOT NULL CHECK (travel_time >= 0),
  source       TEXT NOT NULL DEFAULT 'manual',
  imported_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (site_id, period)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_site_period ON site_snapshots (site_id, period);

CREATE TABLE IF NOT EXISTS benchmark_values (
  metric_key TEXT PRIMARY KEY,
  value      REAL NOT NULL,
  source     TEXT NOT NULL DEFAULT 'illustrative placeholder',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value REAL NOT NULL,
  note  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
