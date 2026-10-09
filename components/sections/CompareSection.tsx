"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusChip, VerdictChip } from "@/components/ui/StatusChip";
import { SiteRadar } from "@/components/charts/SiteRadar";
import { SCORED_METRICS } from "@/lib/domain/metrics";
import { formatInt } from "@/lib/format";
import type { NetworkSite } from "@/lib/db/repository";
import type { Benchmark } from "@/lib/domain/types";

export function CompareSection({ sites, benchmark }: { sites: NetworkSite[]; benchmark: Benchmark }) {
  const [slugs, setSlugs] = useState<string[]>(() => sites.slice(0, 3).map((s) => s.slug));
  const picked = sites.filter((s) => slugs.includes(s.slug));
  const toggle = (slug: string) => setSlugs((cur) => (cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sites to compare">
        {sites.map((s) => (
          <button key={s.slug} type="button" aria-pressed={slugs.includes(s.slug)} onClick={() => toggle(s.slug)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${slugs.includes(s.slug) ? "bg-brand-500 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
            {s.name.split(" – ")[0]}
          </button>
        ))}
      </div>
      {picked.length === 0 ? (
        <Card><p className="text-sm text-muted">Pick at least one site to compare.</p></Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_1.3fr]">
          <Card title="Overlay vs. benchmark" subtitle="Dashed ring = benchmark hospital (100%)">
            <SiteRadar height={380} series={picked.map((s) => ({ name: s.name, analysis: s.analysis }))} />
          </Card>
          <Card title="Side by side" subtitle="Best value per metric is highlighted">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Metric</th>
                    <th className="pb-2 font-medium text-brand-600">Benchmark</th>
                    {picked.map((s) => <th key={s.slug} className="pb-2 font-medium">{s.name.split(" – ")[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {SCORED_METRICS.map((m, i) => {
                    const best = Math.max(...picked.map((s) => s.analysis.scores[i].score));
                    return (
                      <tr key={m.key} className="border-t border-line">
                        <td className="py-2.5 font-medium">{m.label} <span className="text-xs text-muted">({m.unit})</span></td>
                        <td className="py-2.5 tabular-nums text-brand-600">{formatInt(benchmark[m.key])}</td>
                        {picked.map((s) => {
                          const sc = s.analysis.scores[i];
                          return (
                            <td key={s.slug} className="py-2.5">
                              <span className={`inline-block rounded-lg px-2 py-0.5 tabular-nums ${sc.score === best ? "bg-brand-100 font-semibold text-brand-700" : ""}`}>{formatInt(sc.value)}</span>
                              <span className="ml-1.5 align-middle"><StatusChip status={sc.status} /></span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-line">
                    <td className="py-3 font-semibold">Average vs. benchmark</td><td />
                    {picked.map((s) => <td key={s.slug} className="py-3 font-semibold tabular-nums">{formatInt(s.analysis.average)}%</td>)}
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Verdict</td><td />
                    {picked.map((s) => <td key={s.slug} className="py-2"><VerdictChip verdict={s.recommendation.verdict} /></td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
