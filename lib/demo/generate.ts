import { DEFAULT_BENCHMARK, DEFAULT_SETTINGS, METRIC_BY_KEY, SCORED_KEYS } from "../domain/metrics";
import type { ScoredKey, Snapshot } from "../domain/types";

/**
 * Deterministic synthetic dataset for the whole database. Everything is derived top-down from each site's
 * quarterly snapshot, so the detail tables reconcile with it (department beds sum to site beds, monthly
 * bed-days sum to the quarter's bed-days, cost categories sum to the site's facility cost, ...).
 * Pure code, no I/O — used by the SQL emitter, the API seeder and the tests.
 */

export type Row = Record<string, string | number | null>;

export interface DemoSite {
  slug: string;
  name: string;
  region: string;
  kind: string;
  /** +1 = has been improving, -1 = declining, 0 = flat over the seeded quarters */
  trend: number;
  latest: Omit<Snapshot, "period">;
}

const site = (slug: string, name: string, region: string, kind: string, trend: number,
  beds: number, occupancy: number, areaPerBed: number, costPerM2: number, orUtil: number, spaceUse: number, energy: number, travelTime: number): DemoSite =>
  ({ slug, name, region, kind, trend, latest: { beds, occupancy, areaPerBed, costPerM2, orUtil, spaceUse, energy, travelTime } });

// Sites A–C are the sample sites from the project brief (tests rely on them); the rest are invented.
export const DEMO_SITES: DemoSite[] = [
  site("site-a-north", "Site A – North", "North", "Central hospital", 1, 320, 68, 138, 315, 58, 62, 290, 22),
  site("site-b-central", "Site B – Central", "Central", "University hospital", 1, 540, 82, 112, 290, 76, 81, 235, 18),
  site("site-c-rural", "Site C – Rural", "Rural", "Local hospital", -1, 140, 55, 165, 340, 41, 54, 310, 48),
  site("site-d-east", "Site D – East", "East", "Central hospital", -1, 410, 76, 118, 300, 69, 73, 262, 27),
  site("site-e-coast", "Site E – South Coast", "South", "Local hospital", 1, 260, 88, 108, 275, 82, 86, 215, 21),
  site("site-f-archipelago", "Site F – Archipelago", "West", "Local hospital", -1, 90, 49, 178, 365, 36, 48, 335, 62),
  site("site-g-lakeside", "Site G – Lakeside", "North", "Local hospital", 1, 180, 74, 126, 296, 66, 71, 248, 29),
  site("site-h-harbour", "Site H – Harbour", "South", "Central hospital", 1, 460, 84, 109, 283, 78, 83, 226, 20),
  site("site-i-highlands", "Site I – Highlands", "Rural", "Local hospital", -1, 110, 52, 171, 352, 38, 50, 322, 55),
  site("site-j-riverside", "Site J – Riverside", "Central", "Specialist clinic", 1, 120, 79, 124, 310, 85, 78, 241, 24),
  site("site-k-old-town", "Site K – Old Town", "Central", "Central hospital", -1, 380, 71, 134, 322, 63, 66, 284, 19),
  site("site-l-valley", "Site L – Valley", "East", "Local hospital", 0, 200, 66, 144, 318, 52, 64, 276, 36),
  site("site-m-campus", "Site M – University Campus", "Central", "University hospital", 1, 780, 87, 118, 305, 84, 88, 252, 25),
  site("site-n-foothills", "Site N – Foothills", "West", "Local hospital", -1, 130, 58, 158, 338, 44, 57, 301, 44),
  site("site-o-bay", "Site O – Bay", "South", "Central hospital", 0, 350, 79, 115, 292, 72, 77, 247, 26),
  site("site-p-plains", "Site P – Plains", "East", "Central hospital", 1, 300, 77, 121, 287, 70, 75, 238, 31),
  site("site-q-forest", "Site Q – Forest", "North", "Local hospital", -1, 100, 51, 175, 358, 35, 47, 329, 58),
  site("site-r-island", "Site R – Island", "West", "Local hospital", 0, 75, 62, 149, 372, 40, 59, 318, 71),
];

/** Twelve quarters, oldest first. */
export const DEMO_PERIODS = ["2023-Q4", "2024-Q1", "2024-Q2", "2024-Q3", "2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"];

// ---------------------------------------------------------------------------------------------------
// helpers

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Roughly normal noise in [-1, 1]. */
const noise = (r: () => number) => (r() + r() + r() - 1.5) / 1.5;
const round = (v: number, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f; };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Splits an integer total by weights so the parts sum exactly to the total (largest remainder). */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (total * w) / sum);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, frac: e - Math.floor(e) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i]++;
  return out;
}

const quarterMonths = (period: string): string[] => {
  const [y, q] = [Number(period.slice(0, 4)), Number(period.slice(6))];
  return [0, 1, 2].map((i) => `${y}-${String((q - 1) * 3 + i + 1).padStart(2, "0")}-01`);
};
const daysInMonth = (month: string) => { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

// seasonal profiles, January..December
const OCC_SEASON = [1.07, 1.06, 1.02, 0.99, 0.98, 0.96, 0.92, 0.93, 0.99, 1.02, 1.04, 1.06];
const SURGERY_SEASON = [1.02, 1.04, 1.05, 0.96, 1.0, 0.98, 0.8, 0.78, 1.04, 1.07, 1.06, 0.9];
const ENERGY_SHARE = [0.118, 0.108, 0.099, 0.082, 0.068, 0.058, 0.056, 0.056, 0.062, 0.078, 0.098, 0.117]; // sums to 1

interface DeptDef { name: string; alos: number; occOffset: number; nurses: number; doctors: number }
const DEPTS: Record<string, DeptDef> = {
  INT: { name: "Internal medicine", alos: 6.2, occOffset: 3, nurses: 1.25, doctors: 0.22 },
  SUR: { name: "General surgery", alos: 4.5, occOffset: -2, nurses: 1.3, doctors: 0.28 },
  ORT: { name: "Orthopaedics", alos: 5.5, occOffset: 0, nurses: 1.15, doctors: 0.24 },
  CAR: { name: "Cardiology", alos: 4.8, occOffset: 1, nurses: 1.35, doctors: 0.26 },
  NEU: { name: "Neurology", alos: 7.0, occOffset: 1, nurses: 1.3, doctors: 0.24 },
  ONC: { name: "Oncology", alos: 6.5, occOffset: 2, nurses: 1.4, doctors: 0.3 },
  PED: { name: "Paediatrics", alos: 3.4, occOffset: -6, nurses: 1.6, doctors: 0.3 },
  OBG: { name: "Obstetrics & gynaecology", alos: 3.2, occOffset: -8, nurses: 1.5, doctors: 0.28 },
  ICU: { name: "Intensive care", alos: 4.0, occOffset: 0, nurses: 3.2, doctors: 0.6 },
  GER: { name: "Geriatrics & rehabilitation", alos: 12.0, occOffset: 5, nurses: 0.95, doctors: 0.12 },
  PSY: { name: "Psychiatry", alos: 14.0, occOffset: 4, nurses: 1.1, doctors: 0.2 },
};
const DEPT_MIX: Record<string, [string, number][]> = {
  "University hospital": [["INT", 18], ["SUR", 12], ["ORT", 8], ["CAR", 9], ["NEU", 8], ["ONC", 9], ["PED", 8], ["OBG", 7], ["ICU", 8], ["GER", 5], ["PSY", 8]],
  "Central hospital": [["INT", 24], ["SUR", 16], ["ORT", 10], ["CAR", 10], ["NEU", 7], ["PED", 8], ["OBG", 8], ["ICU", 7], ["GER", 10]],
  "Local hospital": [["INT", 36], ["SUR", 18], ["ORT", 10], ["OBG", 8], ["GER", 24], ["ICU", 4]],
  "Specialist clinic": [["ORT", 50], ["SUR", 30], ["GER", 20]],
};
const ED_RATIO: Record<string, number> = { "University hospital": 3.2, "Central hospital": 3.0, "Local hospital": 3.6, "Specialist clinic": 0.4 };
const CASE_HOURS: Record<string, number> = { "University hospital": 2.4, "Central hospital": 2.0, "Local hospital": 1.7, "Specialist clinic": 1.5 };

const COST_SHARES: [string, number][] = [["cleaning", 0.18], ["maintenance", 0.24], ["utilities", 0.22], ["security", 0.05], ["facility_management", 0.17], ["rent_leasing", 0.14]];

const PLACE_A = ["North", "Stone", "Green", "Lake", "Hill", "River", "Oak", "Red", "White", "Fair", "Mill", "Black", "Silver", "Iron", "Salt", "Elm"];
const PLACE_B = ["ton", "field", "bridge", "dale", "port", "wick", "ford", "haven", "ville", "burg"];

// ---------------------------------------------------------------------------------------------------

export interface DemoDataset {
  sites: Row[];
  site_snapshots: Row[];
  departments: Row[];
  department_snapshots: Row[];
  monthly_activity: Row[];
  operating_rooms: Row[];
  cost_breakdown: Row[];
  patient_flows: Row[];
  benchmark_values: Row[];
  settings: Row[];
  meta: Row[];
}

/** Table order for inserts (parents first) and the column used to address every row when wiping a table. */
export const TABLES: { name: keyof DemoDataset; pk: string }[] = [
  { name: "sites", pk: "id" },
  { name: "site_snapshots", pk: "id" },
  { name: "departments", pk: "id" },
  { name: "department_snapshots", pk: "id" },
  { name: "monthly_activity", pk: "id" },
  { name: "operating_rooms", pk: "id" },
  { name: "cost_breakdown", pk: "id" },
  { name: "patient_flows", pk: "id" },
  { name: "benchmark_values", pk: "metric_key" },
  { name: "settings", pk: "key" },
  { name: "meta", pk: "key" },
];

/** Quarterly history for one site, oldest -> newest. The newest quarter is exactly `site.latest`. */
export function historyFor(s: DemoSite, siteIndex: number): Snapshot[] {
  const r = rng(1000 + siteIndex * 77);
  const last = DEMO_PERIODS.length - 1;
  return DEMO_PERIODS.map((period, i) => {
    const quartersAgo = last - i;
    const snap: Snapshot = { period, ...s.latest };
    if (quartersAgo === 0) return snap;
    for (const key of SCORED_KEYS as ScoredKey[]) {
      const latest = s.latest[key];
      const higherIsBetter = METRIC_BY_KEY[key].direction === "higher";
      // Moving "worse" in the past if the trend is improving (and the opposite if declining).
      const worseSign = (higherIsBetter ? -1 : 1) * s.trend;
      const v = latest * (1 + worseSign * quartersAgo * 0.011 + noise(r) * 0.006);
      const isPct = key === "occupancy" || key === "orUtil" || key === "spaceUse";
      snap[key] = isPct ? round(clamp(v, 20, 99.5), 1) : key === "areaPerBed" || key === "travelTime" ? round(v, 1) : round(v);
    }
    return snap;
  });
}

export function generateDemoDataset(): DemoDataset {
  const d: DemoDataset = {
    sites: [], site_snapshots: [], departments: [], department_snapshots: [], monthly_activity: [],
    operating_rooms: [], cost_breakdown: [], patient_flows: [], benchmark_values: [], settings: [], meta: [],
  };
  let deptId = 0;

  DEMO_SITES.forEach((s, si) => {
    const siteId = si + 1;
    const r = rng(5000 + si * 131);
    d.sites.push({ id: siteId, slug: s.slug, name: s.name, region: s.region, kind: s.kind });

    const history = historyFor(s, si);
    const beds = s.latest.beds;

    // departments: fixed bed split per site
    const mix = DEPT_MIX[s.kind] ?? DEPT_MIX["Central hospital"];
    const deptBeds = allocate(beds, mix.map(([, w]) => w));
    const siteDepts = mix.map(([code], i) => {
      deptId++;
      d.departments.push({ id: deptId, site_id: siteId, code, name: DEPTS[code].name });
      return { id: deptId, code, beds: deptBeds[i], def: DEPTS[code] };
    });

    const yearTravel: Record<number, number[]> = {};
    const yearAdmissions: Record<number, number> = {};

    for (const snap of history) {
      d.site_snapshots.push({
        site_id: siteId, period: snap.period, beds: snap.beds, occupancy: snap.occupancy, area_per_bed: snap.areaPerBed,
        cost_per_m2: snap.costPerM2, or_util: snap.orUtil, space_use: snap.spaceUse, energy: snap.energy, travel_time: snap.travelTime,
        source: "demo",
      });

      const months = quarterMonths(snap.period);
      const monthDays = months.map(daysInMonth);
      const days = monthDays.reduce((a, b) => a + b, 0);
      const monthIdx = months.map((m) => Number(m.slice(5, 7)) - 1);

      // department level: occupancy shifted so the bed-weighted mean equals the site occupancy
      const raw = siteDepts.map((x) => snap.occupancy + x.def.occOffset + noise(r) * 2.5);
      const shift = snap.occupancy - raw.reduce((a, o, i) => a + o * siteDepts[i].beds, 0) / beds;
      let quarterBedDays = 0, quarterAdmissions = 0;
      siteDepts.forEach((x, i) => {
        const occ = round(clamp(raw[i] + shift, 25, 99.5), 1);
        const bedDays = Math.round((x.beds * days * occ) / 100);
        const los = round(x.def.alos * (1 + noise(r) * 0.05), 1);
        const admissions = Math.round(bedDays / los);
        quarterBedDays += bedDays;
        quarterAdmissions += admissions;
        d.department_snapshots.push({
          department_id: x.id, period: snap.period, beds: x.beds, occupancy: occ, avg_los_days: los, admissions, bed_days: bedDays,
          nurse_fte: round(x.beds * x.def.nurses * (0.95 + r() * 0.1), 1), physician_fte: round(x.beds * x.def.doctors * (0.95 + r() * 0.1), 1),
        });
      });

      // operating rooms
      const rooms = Math.max(2, Math.round(beds / 28));
      const availableHours = round(rooms * (505 + r() * 30), 1);
      const usedHours = round((availableHours * snap.orUtil) / 100, 1);
      const cases = Math.round(usedHours / (CASE_HOURS[s.kind] ?? 2) / (1 + noise(r) * 0.03));
      d.operating_rooms.push({
        site_id: siteId, period: snap.period, rooms, available_hours: availableHours, used_hours: usedHours, cases,
        cancellation_pct: round(clamp(11 - snap.orUtil * 0.09 + noise(r) * 0.6, 1.5, 12), 1),
        turnover_min: round(clamp(55 - snap.orUtil * 0.3 + noise(r) * 2, 18, 60), 1),
        first_case_ontime_pct: round(clamp(40 + snap.orUtil * 0.5 + noise(r) * 4, 35, 97), 1),
      });

      // monthly activity: quarter totals split by seasonal weights (exact), so months add up to the quarter
      const occWeights = months.map((_, i) => OCC_SEASON[monthIdx[i]] * monthDays[i] * (1 + noise(r) * 0.01));
      const bedDaysM = allocate(quarterBedDays, occWeights);
      const admM = allocate(quarterAdmissions, occWeights.map((w) => w * (1 + noise(r) * 0.03)));
      const surgM = allocate(cases, months.map((_, i) => SURGERY_SEASON[monthIdx[i]] * monthDays[i] * (1 + noise(r) * 0.03)));
      const area = beds * snap.areaPerBed;
      months.forEach((month, i) => {
        d.monthly_activity.push({
          site_id: siteId, month,
          admissions: admM[i],
          discharges: Math.round(admM[i] * (1 + noise(r) * 0.015)),
          ed_visits: Math.round(admM[i] * (ED_RATIO[s.kind] ?? 3) * (1 + noise(r) * 0.06)),
          surgeries: surgM[i],
          bed_days: bedDaysM[i],
          energy_kwh: Math.round(snap.energy * area * ENERGY_SHARE[monthIdx[i]] * (1 + noise(r) * 0.015)),
        });
      });

      // facility cost: annual cost per m² × area, a quarter of it, split across categories (sums exactly)
      const quarterCost = Math.round((snap.costPerM2 * area) / 4);
      const util = clamp(snap.energy / 250, 0.8, 1.3); // energy-hungry buildings spend more on utilities
      const shares = COST_SHARES.map(([c, w]) => (c === "utilities" ? w * util : w) * (1 + noise(r) * 0.04));
      allocate(quarterCost, shares).forEach((amount, i) => {
        d.cost_breakdown.push({ site_id: siteId, period: snap.period, category: COST_SHARES[i][0], amount_eur: amount });
      });

      const year = Number(snap.period.slice(0, 4));
      (yearTravel[year] ??= []).push(snap.travelTime);
      yearAdmissions[year] = (yearAdmissions[year] ?? 0) + quarterAdmissions;
    }

    // catchment: complete years only (2024, 2025). Weighted mean travel time matches the site's yearly mean.
    for (const year of [2024, 2025]) {
      const target = yearTravel[year].reduce((a, b) => a + b, 0) / yearTravel[year].length;
      const n = clamp(Math.round(5 + beds / 90), 6, 11);
      const used = new Set<string>();
      const places = Array.from({ length: n }, () => {
        let name = "";
        do name = PLACE_A[Math.floor(r() * PLACE_A.length)] + PLACE_B[Math.floor(r() * PLACE_B.length)]; while (used.has(name));
        used.add(name);
        return name;
      });
      const base = places.map((_, i) => 0.25 + (i / (n - 1)) * 1.75 + noise(r) * 0.08); // relative distance 0.25..2
      const tau = target * 0.9;
      const weights = base.map((b) => Math.exp(-(b * target) / tau));
      const wSum = weights.reduce((a, b) => a + b, 0);
      const mean = base.reduce((a, b, i) => a + b * weights[i], 0) / wSum;
      const scale = target / mean;
      const patients = allocate(yearAdmissions[year], weights);
      places.forEach((place, i) => {
        d.patient_flows.push({ site_id: siteId, year, municipality: place, patients: patients[i], avg_travel_min: round(Math.max(3, base[i] * scale), 1) });
      });
    }
  });

  for (const [k, v] of Object.entries(DEFAULT_BENCHMARK)) {
    d.benchmark_values.push({ metric_key: k, value: v, source: "illustrative placeholder" });
  }
  const notes: Record<string, string> = {
    alosDays: "average length of stay used to turn bed-days into admissions",
    parThreshold: "score at or above this is 'on par'", watchThreshold: "score at or above this is 'watch'",
    scoreCap: "maximum score per metric (% of benchmark)",
  };
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) d.settings.push({ key: k, value: v, note: notes[k] ?? "" });
  d.meta.push({ key: "data_origin", value: "demo" });
  return d;
}
