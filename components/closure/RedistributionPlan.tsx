"use client";
import { buildChecklist, describeScenario } from "@/lib/closure/engine";
import type { ScenarioConfig, ScenarioResult } from "@/lib/closure/types";
import { formatEuro, formatEuroSigned, formatInt } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { FOCUS } from "./ui";

const PRIORITY = { high: "bg-gap/10 text-gap", medium: "bg-watch/10 text-watch", low: "bg-brand-50 text-brand-700" } as const;

/**
 * Step 4: the redistribution plan.
 * Always visible: who takes how many patients, and the checklist.
 * Collapsed: money & people detail and the A/B comparison.
 */
export function RedistributionPlan({ result, scenarios, results }: {
  result: ScenarioResult;
  scenarios: Record<"A" | "B", ScenarioConfig>;
  results: Record<"A" | "B", ScenarioResult>;
}) {
  const sorted = [...result.used].sort((a, b) => a.t - b.t);
  const src = result.src;
  const rows: [string, string][] = [
    ["Floor area released", `${formatInt(result.releasedM2)} m² of ${formatInt(src.floor_m2)} m²`],
    ["Facility cost saved", `${formatEuro(result.facilitySaving)} / yr`],
    ["Physicians released / needed", `${result.physReleased.toFixed(1)} / ${result.physNeed.toFixed(1)} FTE`],
    ["Nurses released / needed", `${result.nurseReleased.toFixed(1)} / ${result.nurseNeed.toFixed(1)} FTE`],
    ["Staff balance", `${formatEuroSigned(result.staffNet)} / yr`],
    ["Marginal cost of transfers", `−${formatEuro(result.marginal)} / yr`],
    ["Net yearly saving", formatEuroSigned(result.netSaving)],
    ["Patients gaining more than 30 min", `${formatInt(result.over30)} / yr`],
    [`Outpatient visits at ${src.short} (not moved)`, `${formatInt(src.outpatient)} / yr`],
  ];
  const compare: [string, (r: ScenarioResult) => string][] = [
    ["Admissions displaced / yr", (r) => formatInt(r.displaced)],
    ["Absorbed by partners", (r) => formatInt(r.absorbed)],
    ["Without a bed at the cap", (r) => formatInt(r.unabsorbed)],
    ["Partner wards used", (r) => r.used.map((u) => u.site.short).join(", ") || "–"],
    ["Busiest receiver after", (r) => (r.used.length ? `${Math.round(r.maxOccAfter * 100)}%` : "–")],
    ["Extra travel, weighted", (r) => `+${Math.round(r.weightedTravel)} min`],
    ["Net yearly saving", (r) => formatEuroSigned(r.netSaving)],
    ["Verdict", (r) => r.verdict.title],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
        <Card title="Who takes the patients" subtitle={`${describeScenario(result.cfg, src)} · admissions per year`}>
          {sorted.length === 0 ? <p className="text-sm text-muted">No patients need to be redistributed.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">Receiving wards with patients per year, travel time and extra staff</caption>
                <thead><tr className="text-left text-xs text-muted">
                  <th scope="col" className="pb-2 font-medium">Receiving ward</th><th scope="col" className="pb-2 font-medium">Travel</th>
                  <th scope="col" className="pb-2 font-medium">Patients / yr</th><th scope="col" className="pb-2 font-medium">Occupancy</th><th scope="col" className="pb-2 font-medium">Extra physicians</th><th scope="col" className="pb-2 font-medium">Extra nurses</th>
                </tr></thead>
                <tbody>
                  {sorted.map((u) => (
                    <tr key={u.site.id} className="border-t border-line">
                      <th scope="row" className="py-2 text-left font-medium">{u.site.short}</th>
                      <td className="py-2 tabular-nums">{u.t} min</td>
                      <td className="py-2 font-semibold tabular-nums">{formatInt(u.total)}</td>
                      <td className="py-2 tabular-nums">{Math.round(u.site.occ * 100)}% → <strong>{Math.round(u.occAfter * 100)}%</strong></td>
                      <td className="py-2 tabular-nums">{u.physNeed.toFixed(1)}</td>
                      <td className="py-2 tabular-nums">{u.nurseNeed.toFixed(1)}</td>
                    </tr>
                  ))}
                  {result.unabsorbed > 0 && (
                    <tr className="border-t border-line text-gap">
                      <th scope="row" className="py-2 text-left font-semibold">No bed at the {Math.round(result.cfg.maxOcc * 100)}% cap</th>
                      <td className="py-2">–</td><td className="py-2 font-semibold tabular-nums">{formatInt(result.unabsorbed)}</td>
                      <td className="py-2" colSpan={3}>needs about {result.bedsToAdd} beds at a partner, or a higher cap</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Decision checklist" subtitle="Generated from the result, weakest point first.">
          <ul className="space-y-2 text-sm">
            {buildChecklist(result).map((c, i) => (
              <li key={i} className="flex gap-2">
                <input type="checkbox" className="mt-1 accent-brand-500" aria-label={`Done: ${c.text}`} />
                <span><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${PRIORITY[c.priority]}`}>{c.priority}</span>{c.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <details open className="rounded-2xl border border-line bg-surface shadow-card">
        <summary className={`cursor-pointer select-none rounded-2xl px-5 py-3 text-sm font-medium text-brand-600 ${FOCUS}`}>Money and people</summary>
        <table className="w-full border-t border-line p-5 text-sm"><tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t border-line first:border-t-0"><th scope="row" className="px-5 py-1.5 text-left font-normal text-muted">{k}</th><td className="px-5 py-1.5 text-right font-medium tabular-nums">{v}</td></tr>
          ))}
        </tbody></table>
      </details>

      <details open className="rounded-2xl border border-line bg-surface shadow-card">
        <summary className={`cursor-pointer select-none rounded-2xl px-5 py-3 text-sm font-medium text-brand-600 ${FOCUS}`}>Scenario A and B side by side</summary>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="text-left text-xs text-muted">
              <th scope="col" className="px-5 py-2 font-medium">Indicator</th>
              {(["A", "B"] as const).map((k) => <th key={k} scope="col" className="px-3 py-2 font-medium">{k}: {describeScenario(scenarios[k], results[k].src)}</th>)}
            </tr></thead>
            <tbody>
              {compare.map(([label, fn]) => (
                <tr key={label} className="border-t border-line">
                  <th scope="row" className="px-5 py-2 text-left font-normal text-muted">{label}</th>
                  <td className="px-3 py-2 tabular-nums">{fn(results.A)}</td><td className="px-3 py-2 tabular-nums">{fn(results.B)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
