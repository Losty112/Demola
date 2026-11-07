"use client";
import { Card } from "@/components/ui/Card";
import { More } from "@/components/ui/More";
import { METRIC_BY_KEY, SCORED_METRICS } from "@/lib/domain/metrics";
import { formatEuro, formatInt } from "@/lib/format";
import { useHospital } from "@/lib/hospital/store";
import type { Reference } from "@/lib/db/repository";
import { PageShell } from "../shell";

const SETTING_LABELS: Record<string, string> = {
  alosDays: "Average length of stay (days)", parThreshold: "“On par” from score ≥", watchThreshold: "“Watch” from score ≥",
  scoreCap: "Score cap (%)", goodAverage: "Good: average ≥ (%)", closeAverage: "Close/merge: average < (%)",
  closeGaps: "Close/merge: gaps ≥", travelLimit: "Close/merge: extra travel ≤ (min)", releaseFactor: "Released-space cost realised",
  moveFactor: "Moved-service space cost realised", closeFactor: "Full-closure cost realised",
};

/** The benchmark hospital: a theoretical hospital on paper, optionally sized to your number of beds. */
export function Benchmark({ reference }: { reference: Reference }) {
  const { benchmark: b, settings, sources, origin } = reference;
  const { profile, view } = useHospital();
  const beds = view.totals.beds ?? 300;
  const sized = !!(profile && view.totals.beds);
  const area = beds * b.areaPerBed;

  return (
    <PageShell title="Benchmark" icon="layers" intro="The benchmark is a theoretical hospital on paper: what a well-run hospital of your size would look like. Every page measures against it.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Paper sheet */}
        <section aria-labelledby="sheet-title" className="rounded-2xl bg-[#f4f1ea] p-6 text-[#1d2433] shadow-card sm:p-8">
          <div className="flex items-start justify-between gap-3 border-b-2 border-[#1d2433] pb-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#5b6476]">Specification · theoretical</div>
              <h2 id="sheet-title" className="font-display text-4xl tracking-wide">Benchmark Hospital</h2>
            </div>
            <div className="text-right text-xs text-[#5b6476]">{sized ? <>Sized like<br /><b className="text-[#1d2433]">{profile!.name}</b></> : <>Example size<br /><b className="text-[#1d2433]">300 beds</b></>}</div>
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {[
              ["Licensed beds", `${formatInt(beds)}`],
              ["Beds in use on a typical day", `${formatInt((beds * b.occupancy) / 100)} (${b.occupancy}% full)`],
              ["Floor area", `${formatInt(area)} m² (${b.areaPerBed} m² per bed)`],
              ["Space in use", `${b.spaceUse}% of the floor area`],
              ["Building running cost", `${formatEuro(area * b.costPerM2)} a year (${b.costPerM2} €/m²)`],
              ["Energy", `${formatInt((area * b.energy) / 1000)} MWh a year (${b.energy} kWh/m²)`],
              ["Operating rooms", `${b.orUtil}% of available time used`],
              ["Patient travel", `${b.travelTime} min on average`],
              ["Patients a year", `${formatInt((beds * 365 * b.occupancy) / 100 / settings.alosDays)} (stay ${settings.alosDays} days)`],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-dashed border-[#b9b3a5] pb-1.5">
                <dt className="text-[#5b6476]">{k}</dt><dd className="text-right font-semibold">{val}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs text-[#5b6476]">On paper only — no real hospital. Values are placeholders to be agreed with stakeholders.{origin === "demo" ? " Demo data." : ""}</p>
        </section>

        <div className="space-y-5">
          <Card title="Reference values" subtitle="What each benchmark figure means">
            <table className="w-full text-sm">
              <tbody>
                {SCORED_METRICS.map((m) => (
                  <tr key={m.key} className="border-t border-line align-top first:border-t-0" title={m.definition}>
                    <td className="py-2 pr-3"><div className="font-medium">{m.label}</div><div className="text-xs text-muted">{m.definition}{sources[m.key] ? ` · ${sources[m.key]}` : ""}</div></td>
                    <td className="py-2 whitespace-nowrap text-right"><b className="text-brand-600">{b[m.key]}</b> {m.unit}<div className="text-xs text-muted">{METRIC_BY_KEY[m.key].direction} is better</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <More summary="Decision rules">
            <div className="space-y-1 text-sm">
              {Object.entries(settings).map(([k, val]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1"><span className="text-muted">{SETTING_LABELS[k] ?? k}</span><b className="tabular-nums">{val}</b></div>
              ))}
            </div>
          </More>
        </div>
      </div>
    </PageShell>
  );
}
