"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { METRIC_BY_KEY } from "@/lib/domain/metrics";
import type { Benchmark, Settings, Snapshot } from "@/lib/domain/types";
import { FormField, INPUT } from "./fields";

export interface BuildPlan {
  population: number;
  /** Hospital admissions per 1,000 residents per year */
  ratePer1000: number;
  alosDays: number;
  /** Planned values for the remaining metrics, same units as the owner form */
  areaPerBed: number; costPerM2: number; orUtil: number; spaceUse: number; energy: number; travelTime: number;
  targetOcc: number;
}

/** Beds the catchment needs: admissions × length of stay ÷ (365 × target occupancy). */
export const bedsFor = (p: Pick<BuildPlan, "population" | "ratePer1000" | "alosDays" | "targetOcc">, demand = 1) =>
  Math.max(1, Math.ceil((p.population * p.ratePer1000 / 1000 * demand * p.alosDays) / (365 * (p.targetOcc / 100))));

export const planToSnapshot = (p: BuildPlan): Snapshot => ({
  period: "planned", beds: bedsFor(p), occupancy: p.targetOcc, areaPerBed: p.areaPerBed, costPerM2: p.costPerM2,
  orUtil: p.orUtil, spaceUse: p.spaceUse, energy: p.energy, travelTime: p.travelTime,
});

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

/** Stage 2 for builders: the catchment's demand plus planned design targets (pre-filled with benchmark values). */
export function BuilderForm({ benchmark, settings, initial, onSubmit, onBack }: {
  benchmark: Benchmark; settings: Settings; initial?: { name: string; plan: BuildPlan }; onSubmit: (name: string, plan: BuildPlan) => void; onBack: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [v, setV] = useState(initial ? Object.fromEntries(Object.entries(initial.plan).map(([k, n]) => [k, String(n)])) as Record<keyof BuildPlan, string> : {
    population: "", ratePer1000: "110", alosDays: String(settings.alosDays), targetOcc: String(benchmark.occupancy),
    areaPerBed: String(benchmark.areaPerBed), costPerM2: String(benchmark.costPerM2), orUtil: String(benchmark.orUtil),
    spaceUse: String(benchmark.spaceUse), energy: String(benchmark.energy), travelTime: String(benchmark.travelTime),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((c) => ({ ...c, [k]: e.target.value }));
  const plan = Object.fromEntries(Object.entries(v).map(([k, s]) => [k, num(s)])) as unknown as BuildPlan;
  const pctKeys = ["targetOcc", "orUtil", "spaceUse"] as const;
  const bad = Object.entries(plan).find(([k, n]) => !Number.isFinite(n) || n <= 0 || (pctKeys as readonly string[]).includes(k) && n > 100);

  const design: { k: keyof typeof v; label: string; unit: string; bench?: number }[] = [
    { k: "areaPerBed", label: "Planned floor area per bed", unit: "m²", bench: benchmark.areaPerBed },
    { k: "costPerM2", label: "Expected facility cost per m²", unit: "€/yr", bench: benchmark.costPerM2 },
    { k: "orUtil", label: "Planned OR utilisation", unit: "%", bench: benchmark.orUtil },
    { k: "spaceUse", label: "Planned share of space in use", unit: "%", bench: benchmark.spaceUse },
    { k: "energy", label: "Planned energy use", unit: "kWh/m²", bench: benchmark.energy },
    { k: "travelTime", label: "Expected average patient travel time", unit: "min", bench: benchmark.travelTime },
  ];

  return (
    <Card title="Tell us about the planned hospital" subtitle="First the demand of the area it will serve, then your design targets. The targets start at the benchmark values; change what differs.">
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (!bad && name.trim()) onSubmit(name.trim(), plan); }}>
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-ink">1 · Demand of the catchment area</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Project name"><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. New regional hospital" /></FormField>
            <FormField label="Residents served" hint="people in the catchment area"><input type="number" min={1} className={INPUT} value={v.population} onChange={set("population")} required placeholder="250000" /></FormField>
            <FormField label="Admissions per 1,000 residents" hint="per year · typical range 90–140"><input type="number" min={1} step="any" className={INPUT} value={v.ratePer1000} onChange={set("ratePer1000")} required /></FormField>
            <FormField label="Average length of stay" hint="days"><input type="number" min={0.5} step="any" className={INPUT} value={v.alosDays} onChange={set("alosDays")} required /></FormField>
          </div>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-ink">2 · Design targets</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Target bed occupancy" hint={<>% · benchmark {benchmark.occupancy}</>}><input type="number" min={1} max={100} step="any" className={INPUT} value={v.targetOcc} onChange={set("targetOcc")} required /></FormField>
            {design.map((d) => (
              <div key={d.k} title={METRIC_BY_KEY[d.k as keyof typeof METRIC_BY_KEY]?.definition}>
                <FormField label={d.label} hint={<>{d.unit} · benchmark {d.bench}</>}>
                  <input type="number" min={1} max={d.unit === "%" ? 100 : undefined} step="any" className={INPUT} value={v[d.k]} onChange={set(d.k)} required />
                </FormField>
              </div>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setV((c) => ({ ...c, population: "250000" }))} className="rounded-xl px-4 py-2 text-sm font-medium text-par ring-1 ring-par/40 hover:bg-par/10">Fill example (250,000 residents)</button>
          <button type="button" onClick={onBack} className="rounded-xl px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">← Back</button>
          <button type="submit" disabled={!!bad || !name.trim()} className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-50">Show overview</button>
        </div>
      </form>
    </Card>
  );
}
