"use client";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { StatusChip, STATUS_COLOR } from "@/components/ui/StatusChip";
import { SiteRadar } from "@/components/charts/SiteRadar";
import { MetricTrends } from "@/components/charts/MetricTrends";
import { ScenarioChart } from "@/components/charts/ScenarioChart";
import { METRICS, METRIC_BY_KEY } from "@/lib/domain/metrics";
import { analyse } from "@/lib/domain/scoring";
import { runScenarios } from "@/lib/domain/scenarios";
import { recommend } from "@/lib/domain/recommendation";
import { formatEuro, formatInt, formatPeriod } from "@/lib/format";
import type { Benchmark, MetricKey, ScenarioInput, Settings, Snapshot } from "@/lib/domain/types";

interface Props {
  name: string;
  history: Snapshot[];
  benchmark: Benchmark;
  settings: Settings;
  initialScenario: ScenarioInput;
}

const VERDICT_STYLE = {
  good: "border-par/40 bg-par/5 text-par",
  improve: "border-watch/40 bg-watch/5 text-watch",
  restructure: "border-watch/50 bg-watch/10 text-watch",
  close: "border-gap/40 bg-gap/5 text-gap",
} as const;

export function SiteWorkbench({ name, history, benchmark, settings, initialScenario }: Props) {
  const latest = history[history.length - 1];
  const [snap, setSnap] = useState<Snapshot>(latest);
  const [scenario, setScenario] = useState<ScenarioInput>(initialScenario);
  const edited = METRICS.some((m) => snap[m.key as keyof Snapshot] !== latest[m.key as keyof Snapshot]);

  const analysis = useMemo(() => analyse(snap, benchmark, settings), [snap, benchmark, settings]);
  const sc = useMemo(() => runScenarios(analysis, snap, scenario, settings), [analysis, snap, scenario, settings]);
  const rec = useMemo(() => recommend(analysis, snap, benchmark, scenario, settings), [analysis, snap, benchmark, scenario, settings]);

  const setMetric = (key: MetricKey, v: number) => setSnap((s) => ({ ...s, [key]: v }));
  const needShare = Math.min(100, (benchmark.areaPerBed * analysis.bedsNeeded / analysis.totalArea) * 100);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* What-if controls */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card title="What-if inputs" subtitle={`Based on ${formatPeriod(latest.period)} data`}
          action={edited ? <button onClick={() => setSnap(latest)} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100">Reset</button> : undefined}>
          <div className="space-y-3.5">
            {METRICS.map((m) => {
              const v = snap[m.key as keyof Snapshot] as number;
              return (
                <div key={m.key}>
                  <div className="flex justify-between text-xs">
                    <label htmlFor={`in-${m.key}`} className="text-muted">{m.label}</label>
                    <b className="tabular-nums">{formatInt(v)} {m.unit}</b>
                  </div>
                  <input id={`in-${m.key}`} type="range" className="w-full" min={m.min} max={m.max} step={m.step} value={v}
                    onChange={(e) => setMetric(m.key, Number(e.target.value))} />
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">Move any slider to test how a change would shift the site against the benchmark. Nothing is saved.</p>
        </Card>
      </aside>

      <div className="min-w-0 space-y-5">
        {/* Verdict */}
        <div className={`rounded-2xl border-2 p-5 ${VERDICT_STYLE[rec.verdict]}`}>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Recommendation · {name}</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{rec.headline}</h2>
          <p className="mt-1 text-sm text-ink/80">{rec.text}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Average vs. benchmark" value={`${formatInt(analysis.average)}%`} hint={`${analysis.gaps} gap${analysis.gaps === 1 ? "" : "s"} · weakest: ${METRIC_BY_KEY[analysis.worst.key].short}`}
            tone={analysis.average >= settings.goodAverage ? "good" : analysis.average >= settings.closeAverage ? "warn" : "bad"} />
          <Kpi label="Beds needed" value={formatInt(analysis.bedsNeeded)} hint={analysis.surplusBeds > 0 ? `${formatInt(analysis.surplusBeds)} beds above need` : analysis.surplusBeds < 0 ? `${formatInt(-analysis.surplusBeds)} beds short` : "matches need"} />
          <Kpi label="Space above need" value={`${formatInt(analysis.spaceAboveNeed)} m²`} hint={`${formatEuro(analysis.spaceAboveNeedCost)} / yr running cost`} />
          <Kpi label="Cost gap to benchmark" value={formatEuro(analysis.costGap)} hint="per year, at today’s floor area" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Card title="Site vs. the benchmark hospital" subtitle="Each axis is % of benchmark — dashed ring = 100">
            <SiteRadar series={[{ name, analysis }]} />
          </Card>
          <Card title="Metric comparison">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Metric</th><th className="pb-2 font-medium">Value</th><th className="pb-2 font-medium">Bench.</th><th className="pb-2 font-medium">vs. benchmark</th><th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.scores.map((s) => {
                    const m = METRIC_BY_KEY[s.key];
                    return (
                      <tr key={s.key} className="border-t border-line">
                        <td className="py-2.5 pr-2 font-medium leading-tight">{m.label}</td>
                        <td className="py-2.5 pr-2 whitespace-nowrap tabular-nums">{formatInt(s.value)} {m.unit}</td>
                        <td className="py-2.5 pr-2 whitespace-nowrap tabular-nums text-muted">{formatInt(s.benchmark)}</td>
                        <td className="py-2.5 pr-3">
                          <div className="relative h-2 w-16 rounded-full bg-brand-50">
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(s.score / settings.scoreCap) * 100}%`, background: STATUS_COLOR[s.status] }} />
                            <div className="absolute -inset-y-1 w-0.5 bg-ink/50" style={{ left: `${(100 / settings.scoreCap) * 100}%` }} />
                          </div>
                        </td>
                        <td className="py-2.5 whitespace-nowrap"><StatusChip status={s.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <details className="group rounded-2xl border border-line bg-surface shadow-card">
          <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-brand-600 group-open:border-b group-open:border-line">Trends and space need</summary>
          <div className="grid gap-5 p-5 xl:grid-cols-2">
          <Card title="Trend by metric" subtitle="Reported quarters vs. the benchmark line">
            <MetricTrends history={history} benchmark={benchmark} />
          </Card>
          <Card title="Real need: space" subtitle="How much of today’s floor area the benchmark hospital would need">
            <div className="space-y-4 pt-1">
              <div>
                <div className="mb-1 flex justify-between text-xs"><span className="text-muted">Today’s floor area</span><b>{formatInt(analysis.totalArea)} m²</b></div>
                <div className="flex h-8 overflow-hidden rounded-lg bg-brand-50">
                  <div className="grid place-items-center bg-brand-500 text-xs font-medium text-white" style={{ width: `${needShare}%` }}>{needShare > 18 ? "Needed" : ""}</div>
                  <div className="grid flex-1 place-items-center bg-brand-200 text-xs font-medium text-brand-700">{100 - needShare > 14 ? "Above need" : ""}</div>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>{formatInt(benchmark.areaPerBed * analysis.bedsNeeded)} m² needed ({formatInt(analysis.bedsNeeded)} beds × {benchmark.areaPerBed} m²)</span>
                  <span>{formatInt(analysis.spaceAboveNeed)} m² above need</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { l: "Licensed beds", v: formatInt(snap.beds) },
                  { l: "Needed at 85% occ.", v: formatInt(analysis.bedsNeeded) },
                  { l: "Admissions / yr", v: formatInt(analysis.admissions) },
                ].map((x) => (
                  <div key={x.l} className="rounded-xl bg-brand-50 p-3"><div className="text-lg font-semibold text-brand-600">{x.v}</div><div className="text-xs text-muted">{x.l}</div></div>
                ))}
              </div>
              <p className="text-sm text-ink/80">
                {analysis.surplusBeds > 0
                  ? `At benchmark occupancy the site would need about ${formatInt(analysis.bedsNeeded)} of its ${formatInt(snap.beds)} beds — a role discussion should start from that need, not from today’s footprint.`
                  : "Occupancy is already at or above benchmark, so capacity is unlikely to be the lever."}
              </p>
            </div>
          </Card>
          </div>
        </details>

        <Card title="Scenarios: saving vs. access impact" subtitle="Simplified model — a real digital twin would replace these assumptions with live building and patient-flow data">
          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              <span className="flex justify-between">Share of services moved to partner site <b className="text-ink">{scenario.sharePct}%</b></span>
              <input type="range" className="w-full" min={0} max={40} value={scenario.sharePct} onChange={(e) => setScenario((s) => ({ ...s, sharePct: Number(e.target.value) }))} />
            </label>
            <label className="block text-xs text-muted">
              <span className="flex justify-between">Extra travel time to partner site <b className="text-ink">+{scenario.extraTravelMin} min</b></span>
              <input type="range" className="w-full" min={5} max={60} value={scenario.extraTravelMin} onChange={(e) => setScenario((s) => ({ ...s, extraTravelMin: Number(e.target.value) }))} />
            </label>
          </div>
          <ScenarioChart data={[
            { name: "Keep all", saving: 0, patients: 0 },
            { name: "Release space", saving: sc.releaseSaving, patients: 0 },
            { name: `Move ${scenario.sharePct}%`, saving: sc.moveSaving, patients: sc.patientsMoved },
            { name: "Merge / close", saving: sc.closeSaving, patients: sc.patientsClosed },
          ]} />
          <p className="mt-3 text-xs text-muted">
            Assumes {settings.releaseFactor * 100}% of released-space cost, {settings.moveFactor * 100}% of moved-service space cost and {settings.closeFactor * 100}% of full-closure cost is realised.
          </p>
        </Card>

        <Card title="Action plan" subtitle="Every metric, weakest first">
          <ol className="divide-y divide-line">
            {rec.actions.map((a, i) => {
              const m = METRIC_BY_KEY[a.key];
              return (
                <li key={a.key} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 w-5 text-sm text-muted">{i + 1}.</span>
                  <StatusChip status={a.status} />
                  <div className="min-w-0 text-sm">
                    <span className="font-semibold">{m.label}</span> <span className="text-muted">· {formatInt(a.score)}%</span>
                    <div className="text-ink/80">
                      {a.keep ? "Keep: at or above benchmark." : <>{a.action} <span className="text-muted">(now {formatInt(a.now)} {m.unit}, target {formatInt(a.target)} {m.unit})</span></>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Decision rules are illustrative and meant to be agreed with stakeholders: good = average ≥ {settings.goodAverage}% and no gaps; closure/merger only if average &lt; {settings.closeAverage}%, ≥ {settings.closeGaps} gaps and extra travel ≤ {settings.travelLimit} min.
          </p>
        </Card>
      </div>
    </div>
  );
}
