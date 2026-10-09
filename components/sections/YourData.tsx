"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteWorkbench } from "@/components/site/SiteWorkbench";
import { Card } from "@/components/ui/Card";
import { METRICS } from "@/lib/domain/metrics";
import type { Benchmark, MetricKey, ScenarioInput, Settings, Snapshot } from "@/lib/domain/types";

const PERIOD = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
type Values = Record<MetricKey, number>;
/** Made-up example hospitals so the demo opens with a result; the user can overwrite any number. */
const EXAMPLES: { name: string; note: string; v: Values }[] = [
  { name: "Riverside General", note: "Under-used, high cost", v: { beds: 420, occupancy: 64, areaPerBed: 148, costPerM2: 318, orUtil: 57, spaceUse: 61, energy: 285, travelTime: 22 } },
  { name: "Lakeview Clinic", note: "Close to benchmark", v: { beds: 240, occupancy: 83, areaPerBed: 109, costPerM2: 285, orUtil: 78, spaceUse: 84, energy: 228, travelTime: 28 } },
  { name: "Hillcrest Rural", note: "Small, remote, costly", v: { beds: 110, occupancy: 52, areaPerBed: 172, costPerM2: 345, orUtil: 41, spaceUse: 55, energy: 340, travelTime: 54 } },
];
const toStrings = (v: Values) => Object.fromEntries(Object.entries(v).map(([k, n]) => [k, String(n)])) as Record<MetricKey, string>;

export function YourData({ benchmark, settings, scenario }: { benchmark: Benchmark; settings: Settings; scenario: ScenarioInput }) {
  const router = useRouter();
  const [name, setName] = useState(EXAMPLES[0].name);
  const [period, setPeriod] = useState(PERIOD);
  const [vals, setVals] = useState<Record<MetricKey, string>>(() => toStrings(EXAMPLES[0].v));
  const [snap, setSnap] = useState<Snapshot | null>(() => ({ period: PERIOD, ...EXAMPLES[0].v }));
  const load = (e: (typeof EXAMPLES)[number]) => { setName(e.name); setVals(toStrings(e.v)); setSnap({ period, ...e.v }); setMsg(null); };
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = METRICS.map((m) => ({ m, v: vals[m.key].trim() === "" ? NaN : Number(vals[m.key]) }));
  const invalid = parsed.find(({ m, v }) => !Number.isFinite(v) || v <= 0 || (m.unit === "%" && v > 100));
  const build = (): Snapshot => ({ period, ...Object.fromEntries(parsed.map(({ m, v }) => [m.key, v])) } as unknown as Snapshot);

  const save = async () => {
    setSaving(true); setMsg(null);
    const res = await fetch("/api/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, snapshot: build() }) });
    setSaving(false);
    if (res.ok) { setMsg({ ok: true, text: `Saved “${name}” — it now appears in the overview, site analysis and compare sections.` }); router.refresh(); }
    else setMsg({ ok: false, text: (await res.json().catch(() => null))?.error ?? "Could not save." });
  };

  const field = "w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-200";
  return (
    <div className="space-y-5">
      <Card title="Enter a site’s data" subtitle="Type your own numbers — the analysis below is calculated from them.">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Start from an example:</span>
          {EXAMPLES.map((e) => (
            <button key={e.name} type="button" onClick={() => load(e)} className="rounded-full bg-white px-3 py-1.5 font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">{e.name} <span className="text-muted">· {e.note}</span></button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (!invalid && name.trim()) { setSnap(build()); setMsg(null); } }} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">Site name<input className={field} value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label className="text-xs text-muted">Period (e.g. 2026-Q3)<input className={field} value={period} pattern="\d{4}-Q[1-4]" onChange={(e) => setPeriod(e.target.value)} required /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((m) => (
              <label key={m.key} className="text-xs text-muted" title={m.definition}>
                {m.label} ({m.unit}){m.direction && <span className="ml-1 text-brand-600">· bench. {benchmark[m.key as keyof Benchmark]}</span>}
                <input type="number" inputMode="decimal" step="any" min={0} max={m.unit === "%" ? 100 : undefined} className={field} value={vals[m.key]}
                  onChange={(e) => setVals((c) => ({ ...c, [m.key]: e.target.value }))} required />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!!invalid || !name.trim()} className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50">Analyse</button>
            {snap && <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-50">{saving ? "Saving…" : "Save to network"}</button>}
            {invalid && <span className="text-xs text-gap">{invalid.m.label}: enter a positive number{invalid.m.unit === "%" ? " up to 100" : ""}.</span>}
            {msg && <span className={`text-xs ${msg.ok ? "text-par" : "text-gap"}`}>{msg.text}</span>}
          </div>
        </form>
      </Card>
      {snap && <SiteWorkbench key={JSON.stringify(snap) + name} name={name} history={[snap]} benchmark={benchmark} settings={settings} initialScenario={scenario} />}
    </div>
  );
}
