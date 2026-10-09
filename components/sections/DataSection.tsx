import { Card } from "@/components/ui/Card";
import { METRIC_BY_KEY, SCORED_METRICS } from "@/lib/domain/metrics";
import type { Benchmark, Settings } from "@/lib/domain/types";

const SETTING_LABELS: Record<string, string> = {
  alosDays: "Average length of stay (days)", parThreshold: "“On par” from score ≥", watchThreshold: "“Watch” from score ≥",
  scoreCap: "Score cap (%)", goodAverage: "Good: average ≥ (%)", closeAverage: "Close/merge: average < (%)",
  closeGaps: "Close/merge: gaps ≥", travelLimit: "Close/merge: extra travel ≤ (min)", releaseFactor: "Released-space cost realised",
  moveFactor: "Moved-service space cost realised", closeFactor: "Full-closure cost realised",
};

export function DataSection({ benchmark, sources, settings, origin, siteCount, rowCount }: {
  benchmark: Benchmark; sources: Record<string, string>; settings: Settings; origin: "demo" | "imported"; siteCount: number; rowCount: number;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card title="Benchmark hospital" subtitle="Reference values — stored in the benchmark_values table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Metric</th><th className="pb-2 font-medium">Benchmark</th><th className="pb-2 font-medium">Better when</th></tr></thead>
            <tbody>
              {SCORED_METRICS.map((m) => (
                <tr key={m.key} className="border-t border-line align-top" title={m.definition}>
                  <td className="py-2.5 pr-3 font-medium">{m.label}</td>
                  <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums"><b className="text-brand-600">{benchmark[m.key]}</b> {m.unit}<div className="text-xs text-muted">{sources[m.key]}</div></td>
                  <td className="py-2.5 text-muted">{METRIC_BY_KEY[m.key].direction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="space-y-5">
        <Card title="Data" subtitle={`${origin === "demo" ? "Illustrative demo data" : "Imported data"} · ${siteCount} sites · ${rowCount} snapshots`}>
          <p className="text-sm text-ink/80">
            Fill <code className="rounded bg-brand-50 px-1">data/import-template.csv</code>, run <code className="rounded bg-brand-50 px-1">npm run db:import -- yourfile.csv --replace</code> and reload. JSON is available at <code className="rounded bg-brand-50 px-1">/api/sites</code>.
          </p>
        </Card>
        <Card title="Decision rules" subtitle="Illustrative — to be agreed with stakeholders">
          <div className="space-y-1 text-sm">
            {Object.entries(settings).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line py-1"><span className="text-muted">{SETTING_LABELS[k] ?? k}</span><b className="tabular-nums">{v}</b></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
