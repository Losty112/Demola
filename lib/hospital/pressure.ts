import { analyse } from "../domain/scoring";
import type { Benchmark, Settings, StatusKey } from "../domain/types";
import { formatEuroCompact, formatInt } from "../format";
import type { DatasetId } from "./datasets";
import type { HospitalView } from "./derive";

/**
 * Where is the hospital under pressure? Four areas, each with a status, one sentence and a link.
 * Thresholds are illustrative (like the benchmark rules) and meant to be agreed with the client.
 */
export type Area = "beds" | "staff" | "cost" | "energy";

export interface Pressure {
  area: Area;
  title: string;
  href: string;
  status: StatusKey | null; // null = no data yet
  headline: string;
  detail: string;
  needs: DatasetId[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function pressures(v: HospitalView, bench: Benchmark, settings: Settings): Pressure[] {
  const a = v.snapshot ? analyse(v.snapshot, bench, settings) : null;
  const scoreOf = (k: "costPerM2" | "energy") => a?.scores.find((s) => s.key === k);
  const out: Pressure[] = [];

  // Beds: wards that are full (≥ 95 %) or close to it
  {
    const full = v.wards.filter((w) => (w.occupancy ?? 0) >= 0.95);
    const near = v.wards.filter((w) => (w.occupancy ?? 0) >= 0.85 && (w.occupancy ?? 0) < 0.95);
    const ok = v.has.wards && v.has.patients;
    out.push({
      area: "beds", title: "Beds", href: "/wards", needs: ["wards", "patients"],
      status: !ok ? null : full.length ? "gap" : near.length ? "watch" : "par",
      headline: !ok ? "No bed data yet" : full.length ? `${full.length} ward${full.length === 1 ? " is" : "s are"} full` : near.length ? `${near.length} ward${near.length === 1 ? "" : "s"} near capacity` : "Enough free beds",
      detail: !ok ? "Upload wards and patients." : `${full.map((w) => w.name).join(", ") || near.map((w) => w.name).join(", ") || "All wards below 85 %"} · ${formatInt(v.totals.freeBeds ?? 0)} free beds on a typical day`,
    });
  }

  // Staff: share of open posts
  {
    const s = v.totals.openShare;
    const worst = [...v.wards].filter((w) => w.openShare !== null).sort((x, y) => (y.openShare ?? 0) - (x.openShare ?? 0))[0];
    out.push({
      area: "staff", title: "Staff", href: "/staff", needs: ["staff"],
      status: s === null ? null : s >= 0.08 ? "gap" : s >= 0.04 ? "watch" : "par",
      headline: s === null ? "No staff data yet" : `${formatInt(v.totals.openPosts ?? 0)} open posts (${pct(s)})`,
      detail: s === null ? "Upload doctors and staff." : worst ? `Most open posts: ${worst.name} (${pct(worst.openShare ?? 0)})` : "",
    });
  }

  // Cost: facility cost per m² against the benchmark, plus cost per patient
  {
    const sc = scoreOf("costPerM2");
    out.push({
      area: "cost", title: "Cost", href: "/wards", needs: ["costs", "building"],
      status: sc ? sc.status : null,
      headline: v.totals.cost ? `${formatEuroCompact(v.totals.cost.total)} in 12 months` : "No spending data yet",
      detail: sc && v.totals.costPerPatient ? `${formatEuroCompact(v.totals.costPerPatient)} per patient · building ${formatInt(sc.value)} €/m² vs. benchmark ${formatInt(sc.benchmark)}` : "Upload spending and building data.",
    });
  }

  // Energy: kWh per m² against the benchmark
  {
    const sc = scoreOf("energy");
    out.push({
      area: "energy", title: "Energy", href: "/energy", needs: ["energy", "building"],
      status: sc ? sc.status : null,
      headline: sc ? `${formatInt(sc.value)} kWh per m²` : v.has.energy ? `${formatInt((v.totals.electricity ?? 0) / 1000)} MWh electricity` : "No energy data yet",
      detail: sc ? `Benchmark ${formatInt(sc.benchmark)} kWh/m² · ${sc.status === "par" ? "on par" : `${formatInt((sc.value / sc.benchmark - 1) * 100)}% above it`}` : "Upload energy and building data.",
    });
  }
  return out;
}
