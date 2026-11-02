import { DEFAULT_SCENARIO, getBenchmarkSources, getDataOrigin, getNetwork } from "@/lib/db/repository";
import { HospitalFlow } from "@/components/flow/HospitalFlow";
import { NetworkSection } from "@/components/flow/NetworkSection";
import { SiteSection } from "@/components/sections/SiteSection";
import { CompareSection } from "@/components/sections/CompareSection";
import { ClosureSection } from "@/components/sections/ClosureSection";
import { DataSection } from "@/components/sections/DataSection";
import { More } from "@/components/ui/More";

/**
 * The whole app lives on this one page: the visitor chooses "own" or "build", enters data,
 * then reads the overview. Sections that need database data are rendered here (server)
 * and handed to the client-side flow as ready-made slots.
 */
export default async function HomePage() {
  const [net, sources, origin] = await Promise.all([getNetwork(), getBenchmarkSources(), getDataOrigin()]);
  const { sites, benchmark, settings } = net;
  const rowCount = sites.reduce((n, s) => n + s.history.length, 0);

  return (
    <HospitalFlow
      benchmark={benchmark}
      settings={settings}
      scenario={DEFAULT_SCENARIO}
      slots={{
        network: <NetworkSection net={net} />,
        sites: <SiteSection sites={sites} benchmark={benchmark} settings={settings} scenario={DEFAULT_SCENARIO} />,
        compare: <CompareSection sites={sites} benchmark={benchmark} />,
        closure: (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">If one ward closes, where do its patients go?</h2>
              <p className="text-sm text-muted">Four steps: baseline, closure selection, impact, redistribution plan.</p>
            </div>
            <ClosureSection />
          </div>
        ),
        data: (
          <More summary="Show benchmark values, rules and import steps">
            <DataSection benchmark={benchmark} sources={sources} settings={settings} origin={origin} siteCount={sites.length} rowCount={rowCount} />
          </More>
        ),
      }}
    />
  );
}
