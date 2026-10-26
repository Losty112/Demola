// Usage: npm run db:import -- path/to/file.csv [--replace]
//
// One row per site and reporting period. Required columns (see data/import-template.csv):
//   site_slug, site_name, region, kind, period, beds, occupancy, area_per_bed, cost_per_m2,
//   or_util, space_use, energy, travel_time
// Percentages are 0–100. Existing (site, period) rows are updated; --replace wipes all sites first
// (use it to get rid of the demo data).
import fs from "node:fs";
import { getSupabase, unwrap } from "../lib/db/client";
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

const db = getSupabase();
if (replace) {
  // sites cascade to snapshots and all detail tables
  unwrap(await db.from("sites").delete().not("id", "is", null).select("id"), "removing existing sites");
}
const sites = [...new Map(records.map((r) => [r.slug, { slug: r.slug, name: r.name, region: r.region, kind: r.kind }])).values()];
const saved = unwrap(await db.from("sites").upsert(sites, { onConflict: "slug" }).select("id, slug"), "saving sites") as { id: number; slug: string }[];
const idBySlug = new Map(saved.map((s) => [s.slug, s.id]));
const snapshots = records.map((rec) => ({
  site_id: idBySlug.get(rec.slug), period: rec.period, beds: rec.beds, occupancy: rec.occupancy, area_per_bed: rec.areaPerBed,
  cost_per_m2: rec.costPerM2, or_util: rec.orUtil, space_use: rec.spaceUse, energy: rec.energy, travel_time: rec.travelTime,
  source: "csv", imported_at: new Date().toISOString(),
}));
for (let i = 0; i < snapshots.length; i += 500) {
  unwrap(await db.from("site_snapshots").upsert(snapshots.slice(i, i + 500), { onConflict: "site_id,period" }).select("id"), "saving snapshots");
}
unwrap(await db.from("meta").upsert({ key: "data_origin", value: "imported" }, { onConflict: "key" }).select("key"), "saving data origin");

console.log(`Imported ${records.length} rows into Supabase${replace ? " (existing sites replaced)" : ""}.`);
