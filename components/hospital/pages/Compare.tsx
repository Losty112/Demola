"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { STATUS_META, capacityStatus } from "@/lib/closure/status";
import { formatEuro, formatInt } from "@/lib/format";
import { OTHER_HOSPITALS } from "@/lib/hospital/others";
import type { HospitalView, WardView } from "@/lib/hospital/derive";
import { WardBars } from "../charts";
import { NeedsData, PageShell, RequireProfile } from "../shell";

type Key = "occupancy" | "alos" | "costPerPatient" | "patientsPerDoctor" | "openShare" | "emergencyShare";
const METRICS: { key: Key; label: string; unit: string; fmt: (v: number) => string; better: "higher" | "lower" | "near85" }[] = [
  { key: "occupancy", label: "How full", unit: "", fmt: (v) => `${Math.round(v * 100)}%`, better: "near85" },
  { key: "alos", label: "Average stay", unit: "days", fmt: (v) => v.toFixed(1), better: "lower" },
  { key: "costPerPatient", label: "Cost per patient", unit: "", fmt: (v) => formatEuro(v), better: "lower" },
  { key: "patientsPerDoctor", label: "Patients per doctor", unit: "", fmt: (v) => formatInt(v), better: "higher" },
  { key: "openShare", label: "Open posts", unit: "", fmt: (v) => `${Math.round(v * 100)}%`, better: "lower" },
  { key: "emergencyShare", label: "Emergency share", unit: "", fmt: (v) => `${Math.round(v * 100)}%`, better: "lower" },
];

const valueOf = (w: WardView, k: Key): number | null => {
  if (k === "patientsPerDoctor") return w.admissions !== null && w.doctors ? w.admissions / w.doctors : null;
  if (k === "emergencyShare") return w.admissions ? (w.emergency ?? 0) / w.admissions : null;
  return w[k];
};

/**
 * Pressure score per ward (100 = at the reference): how full vs. 85 %, open posts vs. 4 %, cost per bed-day vs.
 * the hospital average. Only the parts with data count. Illustrative weights.
 */
function pressureScore(w: WardView, v: HospitalView) {
  const parts: { label: string; value: number }[] = [];
  if (w.occupancy !== null) parts.push({ label: "beds", value: (w.occupancy / 0.85) * 100 });
  if (w.openShare !== null) parts.push({ label: "staff", value: Math.min(250, (w.openShare / 0.04) * 100) });
  const avgCostPerBedDay = v.totals.cost && v.totals.bedDays ? v.totals.cost.total / v.totals.bedDays : null;
  if (w.cost && w.bedDays && avgCostPerBedDay) parts.push({ label: "cost", value: ((w.cost.total / w.bedDays) / avgCostPerBedDay) * 100 });
  return { score: parts.length ? parts.reduce((a, p) => a + p.value, 0) / parts.length : null, parts };
}

/** Compare: the wards of this hospital with each other; other hospitals only through public, anonymous ward capacity. */
export function Compare() {
  const [key, setKey] = useState<Key>("occupancy");
  const [dept, setDept] = useState<string | null>(null);
  return (
    <PageShell title="Compare" icon="compare" intro="Your wards side by side. Other hospitals appear only with public, anonymous information (ward capacity).">
      <RequireProfile>
        {(s) => {
          const v = s.view;
          if (!v.wards.length) return <NeedsData needs={["wards", "patients"]} what="This page" />;
          const m = METRICS.find((x) => x.key === key)!;
          const rows = v.wards.map((w) => ({ code: w.code, name: w.name, value: valueOf(w, key) })).filter((r): r is { code: string; name: string; value: number } => r.value !== null);
          const avg = rows.length ? rows.reduce((a, r) => a + r.value, 0) / rows.length : 0;
          const ranked = v.wards.map((w) => ({ w, ...pressureScore(w, v) })).filter((r) => r.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const d = dept ?? v.wards[0].code;
          const own = v.wards.find((w) => w.code === d);
          return (
            <>
              <Card title="Wards side by side" subtitle="Pick a figure · dashed line = hospital average">
                <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Figure to compare">
                  {METRICS.map((x) => (
                    <button key={x.key} type="button" aria-pressed={x.key === key} onClick={() => setKey(x.key)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${x.key === key ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}>{x.label}</button>
                  ))}
                </div>
                {rows.length
                  ? <WardBars data={rows} unit={m.unit} format={m.fmt} reference={{ value: avg, label: "average" }}
                      colorOf={key === "occupancy" ? (x) => STATUS_META[capacityStatus(x)].fill : undefined} />
                  : <NeedsData needs={key === "costPerPatient" ? ["costs"] : key === "openShare" || key === "patientsPerDoctor" ? ["staff"] : ["patients"]} what={m.label} />}
                <p className="mt-2 text-xs text-muted">{m.better === "near85" ? "Best around 85 %: fuller means no room for emergencies, emptier means unused beds." : `${m.better === "higher" ? "Higher" : "Lower"} is usually better.`}</p>
              </Card>

              <Card title="Other hospitals: ward capacity" subtitle="Public, anonymous information only — no costs, no patient data">
                <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Ward">
                  {v.wards.map((w) => (
                    <button key={w.code} type="button" aria-pressed={w.code === d} onClick={() => setDept(w.code)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${w.code === d ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}>{w.name}</button>
                  ))}
                </div>
                <CapacityTable code={d} own={own} />
              </Card>

              <Card title="Ranking: which ward is under most pressure" subtitle="100 = at the reference (85 % full, 4 % open posts, average cost per bed-day). Illustrative weights — the ranking will later move to the top.">
                {ranked.length ? (
                  <ol className="space-y-2">
                    {ranked.map((r, i) => {
                      const sc = r.score ?? 0;
                      const tone = sc >= 130 ? "#e5484d" : sc >= 105 ? "#e8920f" : "#12a37a";
                      return (
                        <li key={r.w.code} className="grid grid-cols-[1.5rem_minmax(0,9rem)_1fr_2.5rem] sm:grid-cols-[1.5rem_minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
                          <span className="text-muted">{i + 1}.</span>
                          <span className="truncate font-medium">{r.w.name}</span>
                          <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${Math.min(100, sc / 2.5)}%`, background: tone }} /></div>
                          <b className="text-right tabular-nums sm:hidden">{formatInt(sc)}</b>
                          <span className="hidden w-60 text-right text-xs text-muted sm:inline"><b className="text-ink">{formatInt(sc)}</b> · {r.parts.map((p) => `${p.label} ${formatInt(p.value)}`).join(" · ")}</span>
                        </li>
                      );
                    })}
                  </ol>
                ) : <NeedsData needs={["patients", "staff"]} what="The ranking" />}
              </Card>
            </>
          );
        }}
      </RequireProfile>
    </PageShell>
  );
}

function CapacityTable({ code, own }: { code: string; own?: WardView }) {
  const rows = [
    ...(own ? [{ id: "own", label: "Your hospital", beds: own.beds, occ: own.occupancy, you: true }] : []),
    ...OTHER_HOSPITALS.map((h) => { const w = h.wards.find((x) => x.code === code); return { id: h.id, label: `${h.label} · ${h.kind}`, beds: w?.beds ?? 0, occ: w?.occ ?? null, you: false }; }),
  ].sort((a, b) => b.beds - a.beds);
  const max = Math.max(1, ...rows.map((r) => r.beds));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Hospital</th><th className="pb-2 font-medium">Beds</th><th className="pb-2 font-medium">How full</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const st = r.occ !== null ? STATUS_META[capacityStatus(r.occ)] : null;
            return (
              <tr key={r.id} className={`border-t border-line ${r.you ? "bg-brand-500/15 font-semibold" : ""}`}>
                <td className="py-2 pr-3">{r.label}</td>
                <td className="py-2 pr-3">
                  {r.beds ? (
                    <div className="flex items-center gap-2"><div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${(r.beds / max) * 160}px` }} /><span className="tabular-nums">{r.beds}</span></div>
                  ) : <span className="text-xs text-muted">no such ward</span>}
                </td>
                <td className="py-2">{st && r.beds ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${st.chip}`}>{st.glyph} {Math.round((r.occ ?? 0) * 100)}%</span> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
