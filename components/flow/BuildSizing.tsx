"use client";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { formatEuro, formatEuroCompact, formatInt } from "@/lib/format";
import { bedsFor, type BuildPlan } from "./BuilderForm";

/** Overview block for a planned hospital: what to build, and how sensitive it is to demand. */
export function BuildSizing({ plan }: { plan: BuildPlan }) {
  const row = (demand: number) => {
    const beds = bedsFor(plan, demand);
    const area = beds * plan.areaPerBed;
    return { demand, beds, area, cost: area * plan.costPerM2, admissions: Math.round(plan.population * plan.ratePer1000 / 1000 * demand) };
  };
  const base = row(1);
  const rows = [0.8, 0.9, 1, 1.1, 1.2].map(row);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Beds to build" value={formatInt(base.beds)} hint={`at ${plan.targetOcc}% occupancy`} />
        <Kpi label="Floor area" value={`${formatInt(base.area)} m²`} hint={`${plan.areaPerBed} m² per bed`} />
        <Kpi label="Facility cost" value={formatEuroCompact(base.cost)} hint="per year, once open" tone="warn" />
        <Kpi label="Admissions" value={formatInt(base.admissions)} hint="per year, expected" />
      </div>
      <Card title="What if demand differs?" subtitle="Admissions are an estimate. See how the size of the building moves if demand is 20% lower or higher.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <caption className="sr-only">Beds, floor area and yearly facility cost for different demand levels</caption>
            <thead><tr className="text-left text-xs text-muted">
              {["Demand", "Admissions / yr", "Beds", "Floor area", "Facility cost / yr"].map((h) => <th key={h} scope="col" className="pb-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.demand} className={`border-t border-line ${r.demand === 1 ? "bg-brand-50/60 font-semibold" : ""}`}>
                  <th scope="row" className="py-2 text-left font-medium">{r.demand === 1 ? "Expected" : `${r.demand > 1 ? "+" : "−"}${Math.round(Math.abs(r.demand - 1) * 100)}%`}</th>
                  <td className="py-2 tabular-nums">{formatInt(r.admissions)}</td>
                  <td className="py-2 tabular-nums">{formatInt(r.beds)}</td>
                  <td className="py-2 tabular-nums">{formatInt(r.area)} m²</td>
                  <td className="py-2 tabular-nums">{formatEuro(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
