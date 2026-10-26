import { connection } from "next/server";
import { fetchAll, getSupabase, unwrap } from "./client";
import { DEFAULT_BENCHMARK, DEFAULT_SETTINGS, SCORED_KEYS } from "../domain/metrics";
import { analyse } from "../domain/scoring";
import { recommend } from "../domain/recommendation";
import type {
  Analysis, Benchmark, Recommendation, ScenarioInput, Settings, Site, SiteStats, SiteWithHistory, Snapshot,
} from "../domain/types";

interface SnapshotRow {
  site_id: number; period: string; beds: number; occupancy: number; area_per_bed: number; cost_per_m2: number;
  or_util: number; space_use: number; energy: number; travel_time: number;
}

const toSnapshot = (r: SnapshotRow): Snapshot => ({
  period: r.period, beds: r.beds, occupancy: r.occupancy, areaPerBed: r.area_per_bed, costPerM2: r.cost_per_m2,
  orUtil: r.or_util, spaceUse: r.space_use, energy: r.energy, travelTime: r.travel_time,
});

export const DEFAULT_SCENARIO: ScenarioInput = { sharePct: 15, extraTravelMin: 25 };

// `connection()` keeps these reads out of prerendering: without it the data would be fetched once at build
// time and new data would never show up.

export async function getBenchmark(): Promise<Benchmark> {
  await connection();
  const rows = unwrap(await getSupabase().from("benchmark_values").select("metric_key, value"), "reading benchmark") as { metric_key: string; value: number }[];
  const bench = { ...DEFAULT_BENCHMARK };
  for (const r of rows) if ((SCORED_KEYS as string[]).includes(r.metric_key)) bench[r.metric_key as keyof Benchmark] = Number(r.value);
  return bench;
}

export async function getBenchmarkSources(): Promise<Record<string, string>> {
  await connection();
  const rows = unwrap(await getSupabase().from("benchmark_values").select("metric_key, source"), "reading benchmark sources") as { metric_key: string; source: string }[];
  return Object.fromEntries(rows.map((r) => [r.metric_key, r.source]));
}

export async function getSettings(): Promise<Settings> {
  await connection();
  const rows = unwrap(await getSupabase().from("settings").select("key, value"), "reading settings") as { key: string; value: number }[];
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key as keyof Settings] = Number(r.value);
  return out;
}

export async function getDataOrigin(): Promise<"demo" | "imported"> {
  await connection();
  const row = unwrap(await getSupabase().from("meta").select("value").eq("key", "data_origin").maybeSingle(), "reading data origin") as { value: string } | null;
  return row?.value === "demo" ? "demo" : "imported";
}

async function loadSites(slug?: string): Promise<SiteWithHistory[]> {
  const db = getSupabase();
  const siteQuery = db.from("sites").select("id, slug, name, region, kind");
  const sites = unwrap(await (slug ? siteQuery.eq("slug", slug) : siteQuery.order("name")), "reading sites") as Site[];
  if (!sites.length) return [];
  const ids = sites.map((s) => s.id);
  const snaps = await fetchAll<SnapshotRow>("reading snapshots", (from, to) =>
    db.from("site_snapshots").select("*").in("site_id", ids).order("site_id").order("period").range(from, to));
  const bySite = new Map<number, Snapshot[]>();
  for (const r of snaps) bySite.set(r.site_id, [...(bySite.get(r.site_id) ?? []), toSnapshot(r)]);
  return sites
    .map((s) => {
      const history = bySite.get(s.id) ?? [];
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
  return (await loadSites(slug))[0] ?? null;
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
export async function saveSiteSnapshot(input: SiteInput): Promise<string> {
  const db = getSupabase();
  const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
  const s = input.snapshot;
  const site = unwrap(
    await db.from("sites")
      .upsert({ slug, name: input.name.trim(), region: input.region?.trim() || "—", kind: input.kind?.trim() || "Hospital" }, { onConflict: "slug" })
      .select("id").single(),
    "saving site",
  ) as { id: number };
  unwrap(
    await db.from("site_snapshots").upsert({
      site_id: site.id, period: s.period, beds: s.beds, occupancy: s.occupancy, area_per_bed: s.areaPerBed, cost_per_m2: s.costPerM2,
      or_util: s.orUtil, space_use: s.spaceUse, energy: s.energy, travel_time: s.travelTime, source: "form", imported_at: new Date().toISOString(),
    }, { onConflict: "site_id,period" }).select("id"),
    "saving snapshot",
  );
  unwrap(await db.from("meta").upsert({ key: "data_origin", value: "imported" }, { onConflict: "key" }).select("key"), "saving data origin");
  return slug;
}

/** Departments, monthly activity, operating rooms, cost split and patient catchment of one site. */
export async function getSiteStats(slug: string): Promise<SiteStats | null> {
  await connection();
  const db = getSupabase();
  const site = unwrap(await db.from("sites").select("id").eq("slug", slug).maybeSingle(), "reading site") as { id: number } | null;
  if (!site?.id) return null;
  const [monthly, depts, deptSnaps, rooms, costs, flows] = await Promise.all([
    fetchAll<Record<string, number | string>>("reading monthly activity", (f, t) => db.from("monthly_activity").select("*").eq("site_id", site.id).order("month").range(f, t)),
    fetchAll<{ id: number; code: string; name: string }>("reading departments", (f, t) => db.from("departments").select("id, code, name").eq("site_id", site.id).order("id").range(f, t)),
    fetchAll<Record<string, number | string>>("reading department stats", (f, t) =>
      db.from("department_snapshots").select("*, departments!inner(site_id)").eq("departments.site_id", site.id).order("period").order("department_id").range(f, t)),
    fetchAll<Record<string, number | string>>("reading operating rooms", (f, t) => db.from("operating_rooms").select("*").eq("site_id", site.id).order("period").range(f, t)),
    fetchAll<Record<string, number | string>>("reading costs", (f, t) => db.from("cost_breakdown").select("*").eq("site_id", site.id).order("period").order("category").range(f, t)),
    fetchAll<Record<string, number | string>>("reading patient flows", (f, t) => db.from("patient_flows").select("*").eq("site_id", site.id).order("year").order("patients", { ascending: false }).range(f, t)),
  ]);
  const deptById = new Map(depts.map((d) => [d.id, d]));
  const n = (v: unknown) => Number(v);
  return {
    monthly: monthly.map((r) => ({ month: String(r.month), admissions: n(r.admissions), discharges: n(r.discharges), edVisits: n(r.ed_visits), surgeries: n(r.surgeries), bedDays: n(r.bed_days), energyKwh: n(r.energy_kwh) })),
    departments: deptSnaps.map((r) => {
      const d = deptById.get(n(r.department_id));
      return { code: d?.code ?? "?", name: d?.name ?? "?", period: String(r.period), beds: n(r.beds), occupancy: n(r.occupancy), avgLosDays: n(r.avg_los_days), admissions: n(r.admissions), bedDays: n(r.bed_days), nurseFte: n(r.nurse_fte), physicianFte: n(r.physician_fte) };
    }),
    operatingRooms: rooms.map((r) => ({ period: String(r.period), rooms: n(r.rooms), availableHours: n(r.available_hours), usedHours: n(r.used_hours), cases: n(r.cases), cancellationPct: n(r.cancellation_pct), turnoverMin: n(r.turnover_min), firstCaseOntimePct: n(r.first_case_ontime_pct) })),
    costs: costs.map((r) => ({ period: String(r.period), category: String(r.category), amountEur: n(r.amount_eur) })),
    flows: flows.map((r) => ({ year: n(r.year), municipality: String(r.municipality), patients: n(r.patients), avgTravelMin: n(r.avg_travel_min) })),
  };
}
