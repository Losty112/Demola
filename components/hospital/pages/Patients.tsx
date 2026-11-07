"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { CHART } from "@/components/charts/theme";
import { formatEuro, formatInt } from "@/lib/format";
import { MonthlyBars, WardBars } from "../charts";
import { Figure, NeedsData, PageShell, RequireProfile, Supplied } from "../shell";

type Metric = "admissions" | "alos" | "costPerPatient" | "emergencyShare";
const METRICS: { key: Metric; label: string; unit: string; fmt: (v: number) => string }[] = [
  { key: "admissions", label: "Patients", unit: "patients", fmt: (v) => formatInt(v) },
  { key: "alos", label: "Length of stay", unit: "days", fmt: (v) => v.toFixed(1) },
  { key: "costPerPatient", label: "Cost per patient", unit: "", fmt: (v) => formatEuro(v) },
  { key: "emergencyShare", label: "Emergency share", unit: "", fmt: (v) => `${Math.round(v * 100)}%` },
];

/** Patients: how many come, how long they stay, what they cost — by ward — and the share of emergency admissions. */
export function Patients() {
  const [metric, setMetric] = useState<Metric>("admissions");
  return (
    <PageShell title="Patients" icon="person" intro="How many patients come, how long they stay and what they cost, split by ward. Cost per patient = everything the ward spent ÷ its patients.">
      <RequireProfile>
        {(s) => {
          const v = s.view;
          if (!v.has.patients) return <NeedsData needs={["patients"]} what="This page" />;
          const t = v.totals;
          const emShare = t.admissions ? (t.emergency ?? 0) / t.admissions : 0;
          const m = METRICS.find((x) => x.key === metric)!;
          const rows = v.wards.map((w) => ({
            code: w.code, name: w.name,
            value: metric === "emergencyShare" ? (w.admissions ? (w.emergency ?? 0) / w.admissions : 0) : (w[metric] ?? 0),
          }));
          const missingCost = metric === "costPerPatient" && !v.has.costs;
          return (
            <>
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Figure icon="person" label="Patients" value={formatInt(t.admissions ?? 0)} hint="admissions in 12 months" />
                <Figure icon="clock" label="Average stay" value={`${(t.alos ?? 0).toFixed(1)} days`} hint="bed-days ÷ admissions" />
                <Figure icon="euro" label="Cost per patient" value={t.costPerPatient ? formatEuro(t.costPerPatient) : "—"} hint={v.has.costs ? "all spending ÷ patients" : "needs spending data"} />
                <Figure icon="ambulance" label="Emergency admissions" value={`${Math.round(emShare * 100)}%`} hint={`${formatInt(t.emergency ?? 0)} unplanned`} tone={emShare > 0.6 ? "warn" : "brand"} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <Card title="By ward" subtitle="Pick what to compare">
                  <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Figure to show">
                    {METRICS.map((x) => (
                      <button key={x.key} type="button" aria-pressed={x.key === metric} onClick={() => setMetric(x.key)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${x.key === metric ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}>{x.label}</button>
                    ))}
                  </div>
                  {missingCost ? <NeedsData needs={["costs"]} what="Cost per patient" /> : <WardBars data={rows} unit={m.unit} format={m.fmt} colorOf={metric === "emergencyShare" ? () => "#e5484d" : undefined} />}
                </Card>
                <Card title="Patients per month" subtitle="Planned and emergency admissions">
                  <MonthlyBars unit="patients" data={v.months.map((mm) => ({ month: mm.month, planned: mm.admissions === null ? null : mm.admissions - (mm.emergency ?? 0), emergency: mm.emergency }))}
                    series={[{ key: "planned", label: "Planned", color: CHART.brand, stack: "a" }, { key: "emergency", label: "Emergency", color: "#e5484d", stack: "a" }]} height={300} />
                </Card>
              </div>

              <Card title="Ward table" subtitle="12 months">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="text-left text-xs text-muted">
                      {["Ward", "Patients", "Average stay", "Cost per patient", "Emergency share"].map((h) => <th key={h} scope="col" className="pb-2 pr-3 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {v.wards.map((w) => {
                        const share = w.admissions ? (w.emergency ?? 0) / w.admissions : 0;
                        return (
                          <tr key={w.code} className="border-t border-line">
                            <th scope="row" className="py-2.5 pr-3 text-left font-medium">{w.name}</th>
                            <td className="py-2.5 pr-3 tabular-nums">{formatInt(w.admissions ?? 0)}</td>
                            <td className="py-2.5 pr-3 tabular-nums">{(w.alos ?? 0).toFixed(1)} days</td>
                            <td className="py-2.5 pr-3 tabular-nums">{w.costPerPatient ? formatEuro(w.costPerPatient) : "—"}</td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gap" style={{ width: `${share * 100}%` }} /></div>
                                <span className="tabular-nums">{Math.round(share * 100)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="space-y-1"><Supplied id="patients" s={s} /><Supplied id="costs" s={s} /></div>
            </>
          );
        }}
      </RequireProfile>
    </PageShell>
  );
}
