"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { METRICS } from "@/lib/domain/metrics";
import type { Benchmark, MetricKey, Snapshot } from "@/lib/domain/types";
import { FormField, INPUT } from "./fields";

type Values = Record<MetricKey, number>;
const PERIOD = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;

/** Made-up example hospitals so the demo can start with one click; every number can be overwritten. */
const EXAMPLES: { name: string; note: string; green?: boolean; v: Values }[] = [
  { name: "Riverside General", note: "Under-used, high cost", v: { beds: 420, occupancy: 64, areaPerBed: 148, costPerM2: 318, orUtil: 57, spaceUse: 61, energy: 285, travelTime: 22 } },
  { name: "Lakeview Clinic", note: "Close to benchmark", green: true, v: { beds: 240, occupancy: 83, areaPerBed: 109, costPerM2: 285, orUtil: 78, spaceUse: 84, energy: 228, travelTime: 28 } },
  { name: "Hillcrest Rural", note: "Small, remote, costly", v: { beds: 110, occupancy: 52, areaPerBed: 172, costPerM2: 345, orUtil: 41, spaceUse: 55, energy: 340, travelTime: 54 } },
];
const str = (v: Values) => Object.fromEntries(Object.entries(v).map(([k, n]) => [k, String(n)])) as Record<MetricKey, string>;

/** Stage 2 for owners: the hospital's current numbers. */
export function OwnerForm({ benchmark, initial, onSubmit, onBack }: {
  benchmark: Benchmark; initial?: { name: string; snap: Snapshot }; onSubmit: (name: string, snap: Snapshot) => void; onBack: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [period, setPeriod] = useState(initial?.snap.period ?? PERIOD);
  const [vals, setVals] = useState<Record<MetricKey, string>>(() => Object.fromEntries(METRICS.map((m) => [m.key, initial ? String(initial.snap[m.key as keyof Snapshot]) : ""])) as Record<MetricKey, string>);

  const parsed = METRICS.map((m) => ({ m, v: vals[m.key].trim() === "" ? NaN : Number(vals[m.key]) }));
  const invalid = parsed.find(({ m, v }) => !Number.isFinite(v) || v <= 0 || (m.unit === "%" && v > 100));
  const load = (e: (typeof EXAMPLES)[number]) => { setName(e.name); setVals(str(e.v)); };

  return (
    <Card title="Tell us about your hospital" subtitle="Eight numbers from your latest year or quarter. Hover a label for its definition.">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">No data at hand? Try an example:</span>
        {EXAMPLES.map((e) => (
          <button key={e.name} type="button" onClick={() => load(e)} className={`rounded-full px-3 py-1.5 font-medium ring-1 ${e.green ? "bg-par/10 text-par ring-par/40 hover:bg-par/20" : "bg-white text-brand-700 ring-brand-200 hover:bg-brand-50"}`}>{e.name} <span className={e.green ? "text-par/80" : "text-muted"}>· {e.note}</span></button>
        ))}
      </div>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!invalid && name.trim()) onSubmit(name.trim(), { period, ...Object.fromEntries(parsed.map(({ m, v }) => [m.key, v])) } as unknown as Snapshot); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Hospital name"><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="organization" /></FormField>
          <FormField label="Period" hint="Format 2026-Q3"><input className={INPUT} value={period} pattern="\d{4}-Q[1-4]" onChange={(e) => setPeriod(e.target.value)} required /></FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.key} title={m.definition}>
              <FormField label={m.label} hint={<>{m.unit}{m.direction && <span className="text-brand-600"> · benchmark {benchmark[m.key as keyof Benchmark]}</span>}</>}>
                <input type="number" inputMode="decimal" step="any" min={0} max={m.unit === "%" ? 100 : undefined} className={INPUT} value={vals[m.key]} required
                  onChange={(e) => setVals((c) => ({ ...c, [m.key]: e.target.value }))} />
              </FormField>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onBack} className="rounded-xl px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">← Back</button>
          <button type="submit" disabled={!!invalid || !name.trim()} className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50">Show overview</button>
          {invalid && vals[invalid.m.key] !== "" && <span className="text-xs text-gap" role="alert">{invalid.m.label}: enter a positive number{invalid.m.unit === "%" ? " up to 100" : ""}.</span>}
        </div>
      </form>
    </Card>
  );
}
