import type Database from "better-sqlite3";
import { DEFAULT_BENCHMARK, DEFAULT_SETTINGS, METRIC_BY_KEY, SCORED_KEYS } from "../domain/metrics";
import type { ScoredKey, Snapshot } from "../domain/types";

interface DemoSite {
  slug: string;
  name: string;
  region: string;
  kind: string;
  /** +1 = has been improving, -1 = has been declining, over the seeded quarters */
  trend: number;
  latest: Omit<Snapshot, "period">;
}

// Sites A–C are the sample sites from the project brief. D–F are invented to fill out the network view.
export const DEMO_SITES: DemoSite[] = [
  { slug: "site-a-north", name: "Site A – North", region: "North", kind: "Central hospital", trend: 1,
    latest: { beds: 320, occupancy: 68, areaPerBed: 138, costPerM2: 315, orUtil: 58, spaceUse: 62, energy: 290, travelTime: 22 } },
  { slug: "site-b-central", name: "Site B – Central", region: "Central", kind: "University hospital", trend: 1,
    latest: { beds: 540, occupancy: 82, areaPerBed: 112, costPerM2: 290, orUtil: 76, spaceUse: 81, energy: 235, travelTime: 18 } },
  { slug: "site-c-rural", name: "Site C – Rural", region: "Rural", kind: "Local hospital", trend: -1,
    latest: { beds: 140, occupancy: 55, areaPerBed: 165, costPerM2: 340, orUtil: 41, spaceUse: 54, energy: 310, travelTime: 48 } },
  { slug: "site-d-east", name: "Site D – East", region: "East", kind: "Central hospital", trend: -1,
    latest: { beds: 410, occupancy: 76, areaPerBed: 118, costPerM2: 300, orUtil: 69, spaceUse: 73, energy: 262, travelTime: 27 } },
  { slug: "site-e-coast", name: "Site E – South Coast", region: "South", kind: "Local hospital", trend: 1,
    latest: { beds: 260, occupancy: 88, areaPerBed: 108, costPerM2: 275, orUtil: 82, spaceUse: 86, energy: 215, travelTime: 21 } },
  { slug: "site-f-archipelago", name: "Site F – Archipelago", region: "West", kind: "Local hospital", trend: -1,
    latest: { beds: 90, occupancy: 49, areaPerBed: 178, costPerM2: 365, orUtil: 36, spaceUse: 48, energy: 335, travelTime: 62 } },
];

export const DEMO_PERIODS = ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"];

/** Deterministic history so the demo trend charts are stable between runs. */
function historyFor(site: DemoSite, siteIndex: number): Snapshot[] {
  const last = DEMO_PERIODS.length - 1;
  return DEMO_PERIODS.map((period, i) => {
    const quartersAgo = last - i;
    const snap: Snapshot = { period, ...site.latest };
    SCORED_KEYS.forEach((key: ScoredKey, mi) => {
      const latest = site.latest[key];
      const higherIsBetter = METRIC_BY_KEY[key].direction === "higher";
      // Moving "worse" in the past if the trend is improving (and the opposite if declining).
      const worseSign = (higherIsBetter ? -1 : 1) * site.trend;
      const drift = worseSign * quartersAgo * latest * 0.009;
      const wobble = Math.sin(quartersAgo * 1.7 + siteIndex * 2.3 + mi) * latest * 0.004;
      const v = quartersAgo === 0 ? latest : latest + drift + wobble;
      snap[key] = Math.round(v);
    });
    return snap;
  });
}

export function seedDemoData(db: Database.Database): void {
  const insertSite = db.prepare("INSERT INTO sites (slug, name, region, kind) VALUES (?, ?, ?, ?)");
  const insertSnap = db.prepare(
    `INSERT INTO site_snapshots (site_id, period, beds, occupancy, area_per_bed, cost_per_m2, or_util, space_use, energy, travel_time, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo')`,
  );
  const upsertBench = db.prepare(
    `INSERT INTO benchmark_values (metric_key, value) VALUES (?, ?)
     ON CONFLICT(metric_key) DO NOTHING`,
  );
  const upsertSetting = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING`);
  const setMeta = db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);

  db.transaction(() => {
    DEMO_SITES.forEach((site, i) => {
      const { lastInsertRowid } = insertSite.run(site.slug, site.name, site.region, site.kind);
      for (const h of historyFor(site, i)) {
        insertSnap.run(lastInsertRowid, h.period, h.beds, h.occupancy, h.areaPerBed, h.costPerM2, h.orUtil, h.spaceUse, h.energy, h.travelTime);
      }
    });
    for (const [k, v] of Object.entries(DEFAULT_BENCHMARK)) upsertBench.run(k, v);
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) upsertSetting.run(k, v);
    setMeta.run("data_origin", "demo");
  })();
}
