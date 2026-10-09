import { connection } from "next/server";
import { getDb, transaction } from "./client";
import { DEFAULT_BENCHMARK, DEFAULT_SETTINGS, SCORED_KEYS } from "../domain/metrics";
import { analyse } from "../domain/scoring";
import { recommend } from "../domain/recommendation";
import type { Analysis, Benchmark, Recommendation, ScenarioInput, Settings, Site, SiteWithHistory, Snapshot } from "../domain/types";

interface SnapshotRow {
  period: string; beds: number; occupancy: number; area_per_bed: number; cost_per_m2: number;
  or_util: number; space_use: number; energy: number; travel_time: number;
}

const toSnapshot = (r: SnapshotRow): Snapshot => ({
  period: r.period, beds: r.beds, occupancy: r.occupancy, areaPerBed: r.area_per_bed, costPerM2: r.cost_per_m2,
  orUtil: r.or_util, spaceUse: r.space_use, energy: r.energy, travelTime: r.travel_time,
});

export const DEFAULT_SCENARIO: ScenarioInput = { sharePct: 15, extraTravelMin: 25 };

// `connection()` keeps these queries out of prerendering: SQLite access is synchronous, so without it
// the database would be read once at build time and new data would never show up.

export async function getBenchmark(): Promise<Benchmark> {
  await connection();
  const rows = getDb().prepare("SELECT metric_key, value FROM benchmark_values").all() as unknown as { metric_key: string; value: number }[];
  const bench = { ...DEFAULT_BENCHMARK };
  for (const r of rows) if ((SCORED_KEYS as string[]).includes(r.metric_key)) bench[r.metric_key as keyof Benchmark] = r.value;
  return bench;
}

export async function getBenchmarkSources(): Promise<Record<string, string>> {
  await connection();
  const rows = getDb().prepare("SELECT metric_key, source FROM benchmark_values").all() as unknown as { metric_key: string; source: string }[];
  return Object.fromEntries(rows.map((r) => [r.metric_key, r.source]));
}

export async function getSettings(): Promise<Settings> {
  await connection();
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: number }[];
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as keyof Settings] = r.value;
  return out;
}

export async function getDataOrigin(): Promise<"demo" | "imported"> {
  await connection();
  const row = getDb().prepare("SELECT value FROM meta WHERE key = 'data_origin'").get() as { value: string } | undefined;
  return row?.value === "demo" ? "demo" : "imported";
}

function loadSites(slug?: string): SiteWithHistory[] {
  const db = getDb();
  const sites = (slug
    ? db.prepare("SELECT id, slug, name, region, kind FROM sites WHERE slug = ?").all(slug)
    : db.prepare("SELECT id, slug, name, region, kind FROM sites ORDER BY name").all()) as unknown as Site[];
  const snaps = db.prepare("SELECT * FROM site_snapshots WHERE site_id = ? ORDER BY period");
  return sites
    .map((s) => {
      const history = (snaps.all(s.id) as unknown as SnapshotRow[]).map(toSnapshot);
      return { ...s, history, latest: history[history.length - 1] };
    })
    .filter((s) => s.latest); // sites without any snapshot cannot be analysed yet
}

export async function listSites(): Promise<SiteWithHistory[]> {
  await connection();
  return loadSites();
}

export async function getSite(slug: string): Promise<SiteWithHistory | null> {
  await connection();
  return loadSites(slug)[0] ?? null;
}

export interface NetworkSite extends SiteWithHistory {
  analysis: Analysis;
  recommendation: Recommendation;
  /** Average score per period, same order as `history`. */
  averageHistory: number[];
}

export interface Network {
  sites: NetworkSite[];
  benchmark: Benchmark;
  settings: Settings;
  periods: string[];
}

export async function getNetwork(scenario: ScenarioInput = DEFAULT_SCENARIO): Promise<Network> {
  const [sites, benchmark, settings] = await Promise.all([listSites(), getBenchmark(), getSettings()]);
  const enriched = sites.map((s) => {
    const analysis = analyse(s.latest, benchmark, settings);
    return {
      ...s,
      analysis,
      recommendation: recommend(analysis, s.latest, benchmark, scenario, settings),
      averageHistory: s.history.map((h) => analyse(h, benchmark, settings).average),
    };
  });
  const periods = [...new Set(sites.flatMap((s) => s.history.map((h) => h.period)))].sort();
  return { sites: enriched, benchmark, settings, periods };
}

export interface SiteInput { name: string; region?: string; kind?: string; snapshot: Snapshot }

/** Upserts one site and one period of data entered by a user (same shape the CSV import writes). */
export function saveSiteSnapshot(input: SiteInput): string {
  const db = getDb();
  const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
  const s = input.snapshot;
  transaction(db, () => {
    db.prepare(
      `INSERT INTO sites (slug, name, region, kind) VALUES (?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET name = excluded.name, region = excluded.region, kind = excluded.kind`,
    ).run(slug, input.name.trim(), input.region?.trim() || "—", input.kind?.trim() || "Hospital");
    const { id } = db.prepare("SELECT id FROM sites WHERE slug = ?").get(slug) as { id: number };
    db.prepare(
      `INSERT INTO site_snapshots (site_id, period, beds, occupancy, area_per_bed, cost_per_m2, or_util, space_use, energy, travel_time, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'form')
       ON CONFLICT(site_id, period) DO UPDATE SET beds = excluded.beds, occupancy = excluded.occupancy,
         area_per_bed = excluded.area_per_bed, cost_per_m2 = excluded.cost_per_m2, or_util = excluded.or_util,
         space_use = excluded.space_use, energy = excluded.energy, travel_time = excluded.travel_time,
         source = 'form', imported_at = datetime('now')`,
    ).run(id, s.period, s.beds, s.occupancy, s.areaPerBed, s.costPerM2, s.orUtil, s.spaceUse, s.energy, s.travelTime);
    db.prepare("INSERT INTO meta (key, value) VALUES ('data_origin', 'imported') ON CONFLICT(key) DO UPDATE SET value = 'imported'").run();
  });
  return slug;
}
