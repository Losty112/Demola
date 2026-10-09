import { DEFAULT_SCENARIO, getBenchmarkSources, getDataOrigin, getNetwork } from "@/lib/db/repository";
import { statusOf } from "@/lib/domain/scoring";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { VerdictChip } from "@/components/ui/StatusChip";
import { NetworkRanking } from "@/components/charts/NetworkRanking";
import { NetworkHeatmap } from "@/components/charts/NetworkHeatmap";
import { OccupancyCostBubble } from "@/components/charts/OccupancyCostBubble";
import { BedsNeedChart } from "@/components/charts/BedsNeedChart";
import { NetworkTrend } from "@/components/charts/NetworkTrend";
import { SiteSection } from "@/components/sections/SiteSection";
import { CompareSection } from "@/components/sections/CompareSection";
import { DataSection } from "@/components/sections/DataSection";
import { formatEuroCompact, formatInt } from "@/lib/format";

function Section({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function More({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface shadow-card">
      <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-brand-600 group-open:border-b group-open:border-line">{summary}</summary>
      <div className="p-5">{children}</div>
    </details>
  );
}

export default async function HomePage() {
  const [net, sources, origin] = await Promise.all([getNetwork(), getBenchmarkSources(), getDataOrigin()]);
  const { sites, benchmark, settings, periods } = net;
  const avg = sites.reduce((s, x) => s + x.analysis.average, 0) / Math.max(1, sites.length);
  const surplus = sites.reduce((s, x) => s + Math.max(0, x.analysis.surplusBeds), 0);
  const costGap = sites.reduce((s, x) => s + x.analysis.costGap, 0);
  const rowCount = sites.reduce((n, s) => n + s.history.length, 0);

  return (
    <div className="space-y-12">
      <Section id="network" title="The perfect hospital, as your yardstick" subtitle="Every site against one benchmark hospital — so the real need is visible before a decision about a site’s role is made.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi label="Average vs. benchmark" value={`${formatInt(avg)}%`} hint={`${sites.length} sites · mean of all`} tone={avg >= 90 ? "good" : avg >= 75 ? "warn" : "bad"} />
          <Kpi label="Beds above need" value={formatInt(surplus)} hint="at benchmark occupancy" />
          <Kpi label="Cost gap to benchmark" value={formatEuroCompact(costGap)} hint="per year, all sites" tone="warn" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
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
      </Section>

      <Section id="site" title="Site analysis" subtitle="Pick a site, test what-if changes and read the recommendation.">
        <SiteSection sites={sites} benchmark={benchmark} settings={settings} scenario={DEFAULT_SCENARIO} />
      </Section>

      <Section id="compare" title="Compare sites" subtitle="Put sites side by side against the benchmark hospital.">
        <CompareSection sites={sites} benchmark={benchmark} />
      </Section>

      <Section id="data" title="Benchmark & data" subtitle="What the benchmark is made of and which assumptions drive the analysis.">
        <More summary="Show benchmark values, rules and import steps">
          <DataSection benchmark={benchmark} sources={sources} settings={settings} origin={origin} siteCount={sites.length} rowCount={rowCount} />
        </More>
      </Section>
    </div>
  );
}
