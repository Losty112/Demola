"use client";
import { useState } from "react";
import { SiteWorkbench } from "@/components/site/SiteWorkbench";
import type { NetworkSite } from "@/lib/db/repository";
import type { Benchmark, ScenarioInput, Settings } from "@/lib/domain/types";

export function SiteSection({ sites, benchmark, settings, scenario }: {
  sites: NetworkSite[]; benchmark: Benchmark; settings: Settings; scenario: ScenarioInput;
}) {
  const [slug, setSlug] = useState(sites[0]?.slug);
  const site = sites.find((s) => s.slug === slug) ?? sites[0];
  if (!site) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose site">
          {sites.map((s) => (
            <button key={s.slug} type="button" aria-pressed={s.slug === site.slug} onClick={() => setSlug(s.slug)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${s.slug === site.slug ? "bg-brand-500 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
              {s.name.split(" – ")[0]}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{site.name} · {site.kind} · {site.region} region</p>
      </div>
      <SiteWorkbench key={site.slug} name={site.name} history={site.history} benchmark={benchmark} settings={settings} initialScenario={scenario} />
    </div>
  );
}
