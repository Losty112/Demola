"use client";
import { Card } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { METRIC_BY_KEY } from "@/lib/domain/metrics";
import { analyse } from "@/lib/domain/scoring";
import { recommend } from "@/lib/domain/recommendation";
import { formatInt } from "@/lib/format";
import type { Benchmark, ScenarioInput, Settings, Snapshot } from "@/lib/domain/types";

const VERDICT_STYLE = {
  good: "border-par/40 solid-par text-par",
  improve: "border-watch/40 solid-watch text-watch",
  restructure: "border-watch/50 solid-watch text-watch",
  close: "border-gap/40 solid-gap text-gap",
} as const;

/** The action plan kept from the old "Your hospital" tab: every benchmark metric, weakest first, with what to do. */
export function ActionPlan({ snapshot, benchmark, settings, scenario }: { snapshot: Snapshot; benchmark: Benchmark; settings: Settings; scenario: ScenarioInput }) {
  const analysis = analyse(snapshot, benchmark, settings);
  const rec = recommend(analysis, snapshot, benchmark, scenario, settings);
  return (
    <Card title="Action plan" subtitle="Your hospital against the benchmark hospital — every metric, weakest first">
      <div className={`mb-4 rounded-xl border-2 p-4 ${VERDICT_STYLE[rec.verdict]}`}>
        <div className="text-lg font-semibold tracking-tight">{rec.headline}</div>
        <p className="mt-0.5 text-sm text-ink/80">{rec.text}</p>
      </div>
      <ol className="divide-y divide-line">
        {rec.actions.map((a, i) => {
          const m = METRIC_BY_KEY[a.key];
          return (
            <li key={a.key} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 w-5 text-sm text-muted">{i + 1}.</span>
              <StatusChip status={a.status} />
              <div className="min-w-0 text-sm">
                <span className="font-semibold">{m.label}</span> <span className="text-muted">· {formatInt(a.score)}% of benchmark</span>
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
  );
}
