"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatInt } from "@/lib/format";
import { DAYS_IN_PERIOD, daysInMonth } from "@/lib/hospital/period";
import type { Reference } from "@/lib/db/repository";
import { MonthlyBars } from "../charts";
import { Figure, NeedsData, PageShell, RequireProfile, formatDate } from "../shell";

type Kind = "electricity" | "heat" | "water";
const KINDS: { key: Kind; label: string; unit: string; perBedUnit: string; icon: "bolt" | "flame" | "drop"; color: string; scale: number }[] = [
  { key: "electricity", label: "Electricity", unit: "kWh", perBedUnit: "kWh", icon: "bolt", color: "#e8920f", scale: 1 },
  { key: "heat", label: "Heat", unit: "kWh", perBedUnit: "kWh", icon: "flame", color: "#e5484d", scale: 1 },
  { key: "water", label: "Water", unit: "m³", perBedUnit: "litres", icon: "drop", color: "#0aa5c2", scale: 1000 },
];

/** Energy: electricity, heat and water from the technical department — who supplied it, when, and per bed and day. */
export function Energy({ reference }: { reference: Reference }) {
  const [kind, setKind] = useState<Kind>("electricity");
  return (
    <PageShell title="Energy" icon="bolt" intro="Electricity, heat and water used by the hospital, as reported by the technical department. Per bed and day = consumption ÷ (licensed beds × days).">
      <RequireProfile>
        {(s) => {
          const v = s.view;
          if (!v.has.energy) return <NeedsData needs={["energy"]} what="This page" />;
          const up = s.data.energy!;
          const beds = v.totals.beds;
          const k = KINDS.find((x) => x.key === kind)!;
          const perBed = (total: number | null, scale: number) => (beds && total !== null ? (total * scale) / (beds * DAYS_IN_PERIOD) : null);
          const kwhPerM2 = v.totals.floorArea ? ((v.totals.electricity ?? 0) + (v.totals.heat ?? 0)) / v.totals.floorArea : null;
          return (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3 text-sm">
                <Icon name="building" className="h-6 w-6 text-brand-600" />
                <div>Supplied by <b>{up.suppliedBy || "unknown"}</b> · uploaded {formatDate(up.uploadedAt)}{up.fileName && up.fileName !== "demo data" ? ` · ${up.fileName}` : ""}</div>
                {s.profile?.demo && !s.uploaded.energy && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">demo data</span>}
              </div>

              <div className="stagger grid gap-4 md:grid-cols-3">
                {KINDS.map((x) => {
                  const total = v.totals[x.key];
                  const pb = perBed(total, x.scale);
                  return (
                    <Figure key={x.key} icon={x.icon} label={x.label}
                      value={x.key === "water" ? `${formatInt(total ?? 0)} m³` : `${formatInt((total ?? 0) / 1000)} MWh`}
                      hint={pb !== null ? <><b className="text-ink">{pb < 10 ? pb.toFixed(1) : formatInt(pb)} {x.perBedUnit}</b> per bed and day</> : "per bed needs the wards data"} />
                  );
                })}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Card title="Per month" subtitle="Whole hospital">
                  <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Consumption to show">
                    {KINDS.map((x) => (
                      <button key={x.key} type="button" aria-pressed={x.key === kind} onClick={() => setKind(x.key)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${x.key === kind ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}>
                        <Icon name={x.icon} className="h-3.5 w-3.5" />{x.label}
                      </button>
                    ))}
                  </div>
                  <MonthlyBars unit={k.unit} data={v.months.map((m) => ({ month: m.month, value: m[kind] }))} series={[{ key: "value", label: k.label, color: k.color }]} height={280} />
                </Card>
                <Card title="Per bed and day, by month" subtitle={beds ? `${formatInt(beds)} licensed beds` : "Needs the wards data"}>
                  {beds ? (
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Month</th>{KINDS.map((x) => <th key={x.key} className="pb-2 text-right font-medium">{x.label} <span className="font-normal">({x.perBedUnit})</span></th>)}</tr></thead>
                      <tbody>
                        {v.months.map((m) => (
                          <tr key={m.month} className="border-t border-line">
                            <td className="py-1.5">{new Date(`${m.month}-01`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</td>
                            {KINDS.map((x) => {
                              const val = m[x.key];
                              const pb = val === null ? null : (val * x.scale) / (beds * daysInMonth(m.month));
                              return <td key={x.key} className="py-1.5 text-right tabular-nums">{pb === null ? "—" : pb < 10 ? pb.toFixed(1) : formatInt(pb)}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <NeedsData needs={["wards"]} what="Consumption per bed" />}
                </Card>
              </div>

              {kwhPerM2 !== null ? (
                <Card title="Against the benchmark hospital" subtitle="Electricity + heat per m² of floor area and year">
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div><div className="font-display text-4xl text-watch">{formatInt(kwhPerM2)}</div><div className="text-xs text-muted">kWh/m² · your hospital</div></div>
                    <div><div className="font-display text-4xl text-brand-600">{formatInt(reference.benchmark.energy)}</div><div className="text-xs text-muted">kWh/m² · benchmark</div></div>
                    <p className="max-w-md text-ink/80">{kwhPerM2 > reference.benchmark.energy
                      ? `About ${formatInt((kwhPerM2 / reference.benchmark.energy - 1) * 100)}% above the benchmark. That gap is what an energy retrofit (heating, ventilation, building control) would aim to close.`
                      : "At or below the benchmark."}</p>
                  </div>
                </Card>
              ) : <NeedsData needs={["building"]} what="The benchmark comparison" />}
            </>
          );
        }}
      </RequireProfile>
    </PageShell>
  );
}
