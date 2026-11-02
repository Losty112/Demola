"use client";
import { useMemo, useState } from "react";
import { DEFAULT_REALISE, describeScenario, enrichWard, runScenario } from "@/lib/closure/engine";
import type { Assumptions, ScenarioConfig, TravelMatrix, WardInput } from "@/lib/closure/types";
import { capacityStatus } from "@/lib/closure/status";
import { Card } from "@/components/ui/Card";
import { CapacityLegend, FOCUS, Segmented, StepHeader, StatusBadge } from "./ui";
import { KpiSummary } from "./KpiSummary";
import { NetworkMap, type MapView } from "./NetworkMap";
import { ScenarioControls } from "./ScenarioControls";
import { WardImpactList } from "./WardImpactList";
import { OccupancyChart } from "./OccupancyChart";
import { RedistributionPlan } from "./RedistributionPlan";

type ViewMode = "baseline" | "after" | "split";
type ScenarioKey = "A" | "B";

const VERDICT_STYLE = {
  ok: { box: "border-par/40 solid-par", dot: "bg-par", glyph: "✓" },
  cond: { box: "border-watch/40 solid-watch", dot: "bg-watch", glyph: "!" },
  no: { box: "border-gap/40 solid-gap", dot: "bg-gap", glyph: "✕" },
} as const;

const STEPS = [
  { id: "step-baseline", label: "Baseline" },
  { id: "step-select", label: "Closure selection" },
  { id: "step-impact", label: "Impact analysis" },
  { id: "step-plan", label: "Redistribution plan" },
];

/**
 * Executive closure dashboard.
 *
 * Page logic (top to bottom):
 *   summary   verdict + 3 KPI cards, always at the top for decision makers
 *   step 1    Baseline state        – the network today (map, no flows)
 *   step 2    Closure selection     – choose ward and action
 *   step 3    Impact analysis       – Baseline / Post-closure / Side-by-side view, ward drill-down
 *   step 4    Redistribution plan   – receiving wards, checklist, money, A/B comparison
 *
 * All numbers come from `lib/closure/engine.ts`; this component only holds UI state.
 */
export function ClosureDashboard({ wards: raw, travel, assumptions, defaultSources = [] }: {
  wards: WardInput[];
  travel: TravelMatrix;
  assumptions: Assumptions;
  defaultSources?: string[];
}) {
  const wards = useMemo(() => raw.map(enrichWard), [raw]);
  const pick = (id: string | undefined, fallback: number) => wards.find((w) => w.id === id)?.id ?? wards[Math.min(fallback, wards.length - 1)].id;

  const [scenarios, setScenarios] = useState<Record<ScenarioKey, ScenarioConfig>>(() => ({
    A: { source: pick(defaultSources[0], wards.length - 2), type: "close", share: 0.4, bedsTo: 24, rule: "nearest", ...assumptions },
    B: { source: pick(defaultSources[1], wards.length - 1), type: "close", share: 0.4, bedsTo: 28, rule: "nearest", ...assumptions },
  }));
  const [active, setActive] = useState<ScenarioKey>("A");
  const [mode, setMode] = useState<ViewMode>("after");
  const [showAllFlows, setShowAllFlows] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const cfg = scenarios[active];
  const results = useMemo(() => ({
    A: runScenario(scenarios.A, wards, travel),
    B: runScenario(scenarios.B, wards, travel),
  }), [scenarios, wards, travel]);
  const result = results[active];
  const src = result.src;

  /** Update the active scenario; keep dependent defaults sensible when type or ward changes. */
  const update = (patch: Partial<ScenarioConfig>) =>
    setScenarios((prev) => {
      const next = { ...prev[active], ...patch };
      if (patch.type && patch.type !== prev[active].type) next.realise = DEFAULT_REALISE[patch.type];
      const srcChanged = patch.source && patch.source !== prev[active].source;
      if (srcChanged || (patch.type === "reduce" && prev[active].type !== "reduce")) {
        next.bedsTo = Math.round((wards.find((w) => w.id === next.source)?.beds ?? 0) * 0.65);
      }
      return { ...prev, [active]: next };
    });
  const copy = () => setScenarios((prev) => ({ ...prev, [active === "A" ? "B" : "A"]: { ...prev[active] } }));

  const focusId = hoverId ?? selectedId;
  const verdict = VERDICT_STYLE[result.verdict.k];
  const mapProps = { wards, result, focusId, onFocus: setHoverId, onSelect: (id: string) => setSelectedId((cur) => (cur === id ? null : id)), selectedId, showAllFlows };
  const baselineAtRisk = wards.filter((w) => capacityStatus(w.occ) !== "ok").length;
  const totalBeds = wards.reduce((s, w) => s + w.beds, 0);
  const avgOcc = wards.reduce((s, w) => s + w.occ * w.beds, 0) / Math.max(1, totalBeds);
  const view: MapView = mode === "baseline" ? "baseline" : "after";

  if (!wards.length) return null;

  return (
    <div className="space-y-8">
      {/* ── Summary: verdict + KPI cards ─────────────────────────────── */}
      <div className="space-y-4">
        <div role="status" className={`flex gap-3 rounded-2xl border p-4 ${verdict.box}`}>
          <span aria-hidden="true" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${verdict.dot}`}>{verdict.glyph}</span>
          <div>
            <h3 className="font-semibold text-ink">{describeScenario(cfg, src)}: {result.verdict.title.toLowerCase()}</h3>
            <p className="text-sm text-ink/80">{result.verdict.text}</p>
          </div>
        </div>
        <KpiSummary wards={wards} result={result} />
      </div>

      {/* ── Step navigation ─────────────────────────────────────────── */}
      <nav aria-label="Analysis steps" className="sticky top-16 z-20 -mx-4 border-b border-line bg-night px-4 sm:mx-0 sm:rounded-xl sm:border sm:px-2">
        <ol className="flex gap-1 overflow-x-auto py-2">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-brand-50 hover:text-ink ${FOCUS}`}>
                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>{s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Step 1: Baseline ────────────────────────────────────────── */}
      <section aria-labelledby="step-baseline" className="scroll-mt-36 space-y-4">
        <StepHeader n={1} id="step-baseline" title="Baseline state" subtitle="The network today, before any decision." />
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card>
            <NetworkMap {...mapProps} view="baseline" title="Map of wards today, coloured by occupancy" />
            <div className="mt-3"><CapacityLegend /></div>
          </Card>
          <Card title="Network today" className="h-fit">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Wards</dt><dd className="font-semibold tabular-nums">{wards.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Beds</dt><dd className="font-semibold tabular-nums">{totalBeds}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Average occupancy</dt><dd className="font-semibold tabular-nums">{Math.round(avgOcc * 100)}%</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Wards near or over capacity</dt><dd className="font-semibold tabular-nums">{baselineAtRisk}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-muted">Select a ward on the map to see its details in step 3.</p>
          </Card>
        </div>
      </section>

      {/* ── Step 2: Closure selection ───────────────────────────────── */}
      <section aria-labelledby="step-select" className="scroll-mt-36 space-y-4">
        <StepHeader n={2} id="step-select" title="Closure selection" subtitle="Pick the ward and what happens to it. Everything below updates at once." />
        <Card className="max-w-xl">
          <ScenarioControls wards={wards} cfg={cfg} active={active} onActive={setActive} onChange={update} onCopy={copy} />
        </Card>
      </section>

      {/* ── Step 3: Impact analysis (before / after) ────────────────── */}
      <section aria-labelledby="step-impact" className="scroll-mt-36 space-y-4">
        <StepHeader n={3} id="step-impact" title="Impact analysis" subtitle="Compare the network before and after. Patient flows appear when you hover or select a ward." />
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<ViewMode> label="Scenario view" value={mode} onChange={setMode}
            options={[{ value: "baseline", label: "Baseline state" }, { value: "after", label: "Post-closure scenario" }, { value: "split", label: "Side by side" }]} />
          {mode !== "baseline" && (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" className="accent-brand-500" checked={showAllFlows} onChange={(e) => setShowAllFlows(e.target.checked)} />
              Show all patient flows
            </label>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
          <Card>
            {mode === "split" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {(["baseline", "after"] as const).map((v) => (
                  <figure key={v}>
                    <figcaption className="mb-1 text-sm font-semibold text-ink">{v === "baseline" ? "Baseline state" : "Post-closure scenario"}</figcaption>
                    <NetworkMap {...mapProps} view={v} compact title={v === "baseline" ? "Map before the change" : "Map after the change"} />
                  </figure>
                ))}
              </div>
            ) : (
              <NetworkMap {...mapProps} view={view} title={view === "after" ? "Map after the change, with patient flows on demand" : "Map before the change"} />
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <CapacityLegend />
              <p className="text-xs text-muted">
                {mode === "baseline" ? "Baseline: no patients are moved." : focusId ? <>Showing flows for <strong className="text-ink">{wards.find((w) => w.id === focusId)?.short}</strong>.</> : "Hover or select a ward to see its flows."}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted">Circle size = beds · arrow width = patients received per year.{src && <> <StatusBadge status={capacityStatus(src.occ)} label={`${src.short}: ${Math.round(src.occ * 100)}% today`} /></>}</p>
          </Card>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-ink">{mode === "baseline" ? "Occupancy today" : "Occupancy at partner wards"}</h4>
            <p className="text-xs text-muted">Grey tick = before · dashed red line = {Math.round(cfg.maxOcc * 100)}% cap. Open a ward for details.</p>
            <WardImpactList wards={wards} result={result} view={view} selectedId={selectedId} onSelect={setSelectedId} onHover={setHoverId} />
          </div>
        </div>

        {mode !== "baseline" && result.used.length > 0 && (
          <Card title="Occupancy before and after" subtitle="Receiving wards, nearest first. Acute admissions go only to wards with a cath lab and CCU beds.">
            <OccupancyChart cap={Math.round(cfg.maxOcc * 100)}
              data={[...result.used].sort((a, b) => a.t - b.t).map((u) => ({ name: u.site.short, before: Math.round(u.site.occ * 100), after: Math.round(u.occAfter * 100) }))} />
          </Card>
        )}
      </section>

      {/* ── Step 4: Redistribution plan ─────────────────────────────── */}
      <section aria-labelledby="step-plan" className="scroll-mt-36 space-y-4">
        <StepHeader n={4} id="step-plan" title="Redistribution plan" subtitle="Who takes the patients, what it costs and what to confirm before deciding." />
        <RedistributionPlan result={result} scenarios={scenarios} results={results} />
      </section>
    </div>
  );
}
