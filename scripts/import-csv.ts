// Usage: npm run db:import -- path/to/file.csv [--replace]
//
// One row per site and reporting period. Required columns (see data/import-template.csv):
//   site_slug, site_name, region, kind, period, beds, occupancy, area_per_bed, cost_per_m2,
//   or_util, space_use, energy, travel_time
// Percentages are 0–100. Existing (site, period) rows are updated; --replace wipes all sites first
// (use it to get rid of the demo data).
import fs from "node:fs";
import { openDb, DB_PATH } from "../lib/db/client";
import { parseCsv } from "../lib/csv";

const REQUIRED = ["site_slug", "site_name", "period", "beds", "occupancy", "area_per_bed", "cost_per_m2", "or_util", "space_use", "energy", "travel_time"];
const PCT = ["occupancy", "or_util", "space_use"];

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const replace = args.includes("--replace");
if (!file) {
  console.error("Usage: npm run db:import -- <file.csv> [--replace]");
  process.exit(1);
}

const [header, ...rows] = parseCsv(fs.readFileSync(file, "utf-8"));
const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
const missing = REQUIRED.filter((c) => !(c in col));
if (missing.length) {
  console.error(`Missing columns: ${missing.join(", ")}`);
  process.exit(1);
}

const errors: string[] = [];
const records = rows.map((r, i) => {
  const get = (c: string) => (r[col[c]] ?? "").trim();
  const num = (c: string) => {
    const v = Number(get(c));
    if (!Number.isFinite(v)) errors.push(`Row ${i + 2}: "${c}" is not a number (${get(c) || "empty"})`);
    return v;
  };
  const rec = {
    slug: get("site_slug"), name: get("site_name"), region: get("region"), kind: get("kind") || "Hospital",
    period: get("period"), beds: num("beds"), occupancy: num("occupancy"), areaPerBed: num("area_per_bed"),
    costPerM2: num("cost_per_m2"), orUtil: num("or_util"), spaceUse: num("space_use"), energy: num("energy"),
    travelTime: num("travel_time"),
  };
  if (!rec.slug || !rec.name) errors.push(`Row ${i + 2}: site_slug and site_name are required`);
  if (!/^\d{4}-Q[1-4]$/.test(rec.period)) errors.push(`Row ${i + 2}: period must look like 2026-Q3 (got "${rec.period}")`);
  for (const c of PCT) {
    const v = Number(get(c));
    if (v < 0 || v > 100) errors.push(`Row ${i + 2}: "${c}" must be 0–100 (got ${v})`);
  }
  return rec;
});
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const db = openDb();
const upsertSite = db.prepare(
  `INSERT INTO sites (slug, name, region, kind) VALUES (@slug, @name, @region, @kind)
   ON CONFLICT(slug) DO UPDATE SET name = excluded.name, region = excluded.region, kind = excluded.kind`,
);
const siteId = db.prepare("SELECT id FROM sites WHERE slug = ?");
const upsertSnap = db.prepare(
  `INSERT INTO site_snapshots (site_id, period, beds, occupancy, area_per_bed, cost_per_m2, or_util, space_use, energy, travel_time, source)
   VALUES (@siteId, @period, @beds, @occupancy, @areaPerBed, @costPerM2, @orUtil, @spaceUse, @energy, @travelTime, 'csv')
   ON CONFLICT(site_id, period) DO UPDATE SET beds = excluded.beds, occupancy = excluded.occupancy,
     area_per_bed = excluded.area_per_bed, cost_per_m2 = excluded.cost_per_m2, or_util = excluded.or_util,
     space_use = excluded.space_use, energy = excluded.energy, travel_time = excluded.travel_time,
     source = 'csv', imported_at = datetime('now')`,
);

db.transaction(() => {
  if (replace) db.exec("DELETE FROM site_snapshots; DELETE FROM sites;");
  for (const rec of records) {
    upsertSite.run(rec);
    const { id } = siteId.get(rec.slug) as { id: number };
    upsertSnap.run({ ...rec, siteId: id });
  }
  db.prepare("INSERT INTO meta (key, value) VALUES ('data_origin', 'imported') ON CONFLICT(key) DO UPDATE SET value = 'imported'").run();
})();

console.log(`Imported ${records.length} rows into ${DB_PATH}${replace ? " (existing sites replaced)" : ""}.`);
