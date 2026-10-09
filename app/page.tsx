import Link from "next/link";
import { getNetwork } from "@/lib/db/repository";
import { statusOf } from "@/lib/domain/scoring";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { VerdictChip } from "@/components/ui/StatusChip";
import { NetworkRanking } from "@/components/charts/NetworkRanking";
import { NetworkHeatmap } from "@/components/charts/NetworkHeatmap";
import { OccupancyCostBubble } from "@/components/charts/OccupancyCostBubble";
import { BedsNeedChart } from "@/components/charts/BedsNeedChart";
import { NetworkTrend } from "@/components/charts/NetworkTrend";
import { formatEuroCompact, formatInt } from "@/lib/format";

export default async function OverviewPage() {
  const net = await getNetwork();
  const { sites, benchmark, settings, periods } = net;
  const avg = sites.reduce((s, x) => s + x.analysis.average, 0) / Math.max(1, sites.length);
  const surplus = sites.reduce((s, x) => s + Math.max(0, x.analysis.surplusBeds), 0);
  const space = sites.reduce((s, x) => s + x.analysis.spaceAboveNeed, 0);
  const costGap = sites.reduce((s, x) => s + x.analysis.costGap, 0);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white via-brand-50 to-brand-100 p-7 shadow-card sm:p-10">
        <div className="max-w-2xl">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-200">For hospital directors</span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">The perfect hospital, as your yardstick.</h1>
          <p className="mt-3 text-lg text-muted">One comparable view of every site: cost, space and utilization against a benchmark hospital — so the real need is visible before a decision about a site’s role is made.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/sites/${sites[0]?.slug ?? ""}`} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">Analyse a site</Link>
            <Link href="/compare" className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50">Compare sites</Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Sites in network" value={String(sites.length)} hint={`${periods.length} reporting periods`} />
        <Kpi label="Average vs. benchmark" value={`${formatInt(avg)}%`} hint="mean of all sites" tone={avg >= 90 ? "good" : avg >= 75 ? "warn" : "bad"} />
        <Kpi label="Beds above need" value={formatInt(surplus)} hint={`${formatInt(space)} m² space above need`} />
        <Kpi label="Cost gap to benchmark" value={formatEuroCompact(costGap)} hint="per year, all sites" tone="warn" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Site ranking" subtitle="Average of the seven metrics, as % of the benchmark hospital">
          <NetworkRanking data={sites.map((s) => ({ name: s.name, average: Math.round(s.analysis.average), status: statusOf(s.analysis.average, settings) }))} />
        </Card>
        <Card title="Occupancy vs. facility cost" subtitle="Bubble size = licensed beds. Green zone = better than benchmark on both">
          <OccupancyCostBubble benchOccupancy={benchmark.occupancy} benchCost={benchmark.costPerM2}
            data={sites.map((s) => ({ name: s.name, occupancy: s.latest.occupancy, cost: s.latest.costPerM2, beds: s.latest.beds, status: statusOf(s.analysis.average, settings) }))} />
        </Card>
      </div>

      <Card title="One comparable view of every site" subtitle="Heatmap of all metrics against the benchmark hospital">
        <NetworkHeatmap sites={sites} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Real need: beds" subtitle="Beds each site would need at benchmark occupancy vs. beds above need">
          <BedsNeedChart data={sites.map((s) => ({ name: s.name, needed: s.analysis.bedsNeeded, surplus: Math.max(0, s.analysis.surplusBeds) }))} />
        </Card>
        <Card title="Performance over time" subtitle="Average % of benchmark per reporting period">
          <NetworkTrend periods={periods} series={sites.map((s) => ({
            name: s.name,
            values: periods.map((p) => { const i = s.history.findIndex((h) => h.period === p); return i < 0 ? null : s.averageHistory[i]; }),
          }))} />
        </Card>
      </div>

      <Card title="Recommendation per site" subtitle="Based on the default scenario (15% moved, +25 min travel)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-2 font-medium">Site</th><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Beds</th><th className="pb-2 font-medium">Average</th><th className="pb-2 font-medium">Gaps</th><th className="pb-2 font-medium">Verdict</th><th /></tr></thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.slug} className="border-t border-line">
                  <td className="py-3 font-medium">{s.name}</td>
                  <td className="py-3 text-muted">{s.kind}</td>
                  <td className="py-3 tabular-nums">{formatInt(s.latest.beds)}</td>
                  <td className="py-3 tabular-nums">{formatInt(s.analysis.average)}%</td>
                  <td className="py-3 tabular-nums">{s.analysis.gaps}</td>
                  <td className="py-3"><VerdictChip verdict={s.recommendation.verdict} /></td>
                  <td className="py-3 text-right"><Link href={`/sites/${s.slug}`} className="font-medium text-brand-600 hover:underline">Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
