import { statusOf } from "@/lib/domain/scoring";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { More } from "@/components/ui/More";
import { VerdictChip } from "@/components/ui/StatusChip";
import { NetworkRanking } from "@/components/charts/NetworkRanking";
import { NetworkHeatmap } from "@/components/charts/NetworkHeatmap";
import { OccupancyCostBubble } from "@/components/charts/OccupancyCostBubble";
import { BedsNeedChart } from "@/components/charts/BedsNeedChart";
import { NetworkTrend } from "@/components/charts/NetworkTrend";
import type { Network } from "@/lib/db/repository";
import { formatEuroCompact, formatInt } from "@/lib/format";

/** Network overview: every site against the benchmark hospital (server component, data comes from the database). */
export function NetworkSection({ net }: { net: Network }) {
  const { sites, benchmark, settings, periods } = net;
  const avg = sites.reduce((s, x) => s + x.analysis.average, 0) / Math.max(1, sites.length);
  const surplus = sites.reduce((s, x) => s + Math.max(0, x.analysis.surplusBeds), 0);
  const costGap = sites.reduce((s, x) => s + x.analysis.costGap, 0);

  return (
    <div className="space-y-5">
      <div className="stagger grid gap-4 sm:grid-cols-3">
        <Kpi label="Average vs. benchmark" value={`${formatInt(avg)}%`} hint={`${sites.length} sites · mean of all`} tone={avg >= 90 ? "good" : avg >= 75 ? "warn" : "bad"} />
        <Kpi label="Beds above need" value={formatInt(surplus)} hint="at benchmark occupancy" />
        <Kpi label="Cost gap to benchmark" value={formatEuroCompact(costGap)} hint="per year, all sites" tone="warn" />
      </div>

      <div className="stagger grid gap-5 xl:grid-cols-2">
        <Card title="Site ranking" subtitle="Average of the seven metrics, as % of the benchmark">
          <NetworkRanking data={sites.map((s) => ({ name: s.name, average: Math.round(s.analysis.average), status: statusOf(s.analysis.average, settings) }))} />
        </Card>
        <Card title="Recommendation per site" subtitle="Default scenario: 15% moved, +25 min travel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Site</th><th className="pb-2 font-medium">Avg</th><th className="pb-2 font-medium">Verdict</th></tr></thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.slug} className="border-t border-line">
                    <td className="py-2.5 font-medium">{s.name}</td>
                    <td className="py-2.5 tabular-nums">{formatInt(s.analysis.average)}%</td>
                    <td className="py-2.5"><VerdictChip verdict={s.recommendation.verdict} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="All metrics at a glance" subtitle="Heatmap against the benchmark hospital">
        <NetworkHeatmap sites={sites} />
      </Card>

      <More summary="More network charts">
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Occupancy vs. facility cost" subtitle="Bubble size = licensed beds">
            <OccupancyCostBubble benchOccupancy={benchmark.occupancy} benchCost={benchmark.costPerM2}
              data={sites.map((s) => ({ name: s.name, occupancy: s.latest.occupancy, cost: s.latest.costPerM2, beds: s.latest.beds, status: statusOf(s.analysis.average, settings) }))} />
          </Card>
          <Card title="Real need: beds" subtitle="Beds needed at benchmark occupancy vs. beds above need">
            <BedsNeedChart data={sites.map((s) => ({ name: s.name, needed: s.analysis.bedsNeeded, surplus: Math.max(0, s.analysis.surplusBeds) }))} />
          </Card>
          <Card title="Performance over time" subtitle="Average % of benchmark per period" className="xl:col-span-2">
            <NetworkTrend periods={periods} series={sites.map((s) => ({
              name: s.name,
              values: periods.map((p) => { const i = s.history.findIndex((h) => h.period === p); return i < 0 ? null : s.averageHistory[i]; }),
            }))} />
          </Card>
        </div>
      </More>
    </div>
  );
}
