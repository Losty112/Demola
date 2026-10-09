import { getBenchmark, getBenchmarkSources, getDataOrigin, getSettings, listSites } from "@/lib/db/repository";
import { Card } from "@/components/ui/Card";
import { METRIC_BY_KEY, SCORED_METRICS } from "@/lib/domain/metrics";
import { DB_PATH } from "@/lib/db/client";

export const metadata = { title: "Benchmark & data · Benchmark Hospital" };

const SETTING_LABELS: Record<string, string> = {
  alosDays: "Average length of stay (days)", parThreshold: "“On par” from score ≥", watchThreshold: "“Watch” from score ≥",
  scoreCap: "Score cap (%)", goodAverage: "Good: average ≥ (%)", closeAverage: "Close/merge: average < (%)",
  closeGaps: "Close/merge: gaps ≥", travelLimit: "Close/merge: extra travel ≤ (min)", releaseFactor: "Released-space cost realised",
  moveFactor: "Moved-service space cost realised", closeFactor: "Full-closure cost realised",
};

export default async function DataPage() {
  const [bench, sources, settings, origin, sites] = await Promise.all([getBenchmark(), getBenchmarkSources(), getSettings(), getDataOrigin(), listSites()]);
  const rows = sites.reduce((n, s) => n + s.history.length, 0);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Benchmark & data</h1>
        <p className="text-sm text-muted">What the benchmark hospital is made of, which assumptions drive the analysis, and how to load real data.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Benchmark hospital" subtitle="Reference values — stored in the benchmark_values table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Metric</th><th className="pb-2 font-medium">Benchmark</th><th className="pb-2 font-medium">Better when</th><th className="pb-2 font-medium">Definition</th></tr></thead>
              <tbody>
                {SCORED_METRICS.map((m) => (
                  <tr key={m.key} className="border-t border-line align-top">
                    <td className="py-2.5 pr-3 font-medium">{m.label}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums"><b className="text-brand-600">{bench[m.key]}</b> {m.unit}<div className="text-xs text-muted">{sources[m.key]}</div></td>
                    <td className="py-2.5 pr-3 text-muted">{METRIC_BY_KEY[m.key].direction}</td>
                    <td className="py-2.5 text-muted">{m.definition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Database" subtitle="SQLite, created automatically on first start">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Data origin</dt><dd className="font-medium">{origin === "demo" ? "Illustrative demo data" : "Imported data"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Sites</dt><dd className="font-medium tabular-nums">{sites.length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Site snapshots</dt><dd className="font-medium tabular-nums">{rows}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">File</dt><dd className="truncate font-mono text-xs" title={DB_PATH}>{DB_PATH.split("/").slice(-2).join("/")}</dd></div>
            </dl>
          </Card>
          <Card title="Loading your data">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-ink/80">
              <li>Fill <code className="rounded bg-brand-50 px-1">data/import-template.csv</code>: one row per site and quarter.</li>
              <li>Run <code className="rounded bg-brand-50 px-1">npm run db:import -- yourfile.csv --replace</code> (<code className="rounded bg-brand-50 px-1">--replace</code> removes the demo sites).</li>
              <li>Edit benchmark values and thresholds directly in the <code className="rounded bg-brand-50 px-1">benchmark_values</code> and <code className="rounded bg-brand-50 px-1">settings</code> tables.</li>
              <li>Reload — every chart, score and recommendation updates. JSON is also available at <code className="rounded bg-brand-50 px-1">/api/sites</code>.</li>
            </ol>
          </Card>
        </div>
      </div>

      <Card title="Assumptions & decision rules" subtitle="Illustrative — to be agreed with stakeholders (settings table)">
        <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(settings).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5"><span className="text-muted">{SETTING_LABELS[k] ?? k}</span><b className="tabular-nums">{v}</b></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
