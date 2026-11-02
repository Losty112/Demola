"use client";
import type { ScenarioResult, Ward } from "@/lib/closure/types";
import { STATUS_META, capacityStatus, type CapacityStatus } from "@/lib/closure/status";
import { AnimatedValue } from "@/components/flow/AnimatedValue";
import { formatEuro, formatEuroSigned, formatInt } from "@/lib/format";

const TONE: Record<"good" | "warn" | "bad", string> = { good: "text-par", warn: "text-watch", bad: "text-gap" };
const BAR: Record<"good" | "warn" | "bad", string> = { good: "bg-par", warn: "bg-watch", bad: "bg-gap" };

function KpiCard({ title, value, tone, children }: { title: string; value: string; tone: "good" | "warn" | "bad"; children: React.ReactNode }) {
  return (
    <article className="glass flex flex-col rounded-2xl border border-line bg-gradient-to-b from-white/10 to-white/[0.02] p-5 shadow-card backdrop-blur">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <p className={`mt-2 font-display text-4xl leading-none tabular-nums ${TONE[tone]}`}><AnimatedValue text={value} /></p>
      <div className="mt-3 space-y-2 text-sm text-muted">{children}</div>
    </article>
  );
}

/** Wards (other than the source) ranked by status after the scenario, worst first. */
export function riskWards(wards: Ward[], result: ScenarioResult) {
  return wards
    .filter((w) => w.id !== result.src.id || result.cfg.type !== "close")
    .map((w) => {
      const after = result.used.find((u) => u.site.id === w.id)?.occAfter ?? w.occ;
      return { ward: w, before: w.occ, after, status: capacityStatus(after) as CapacityStatus, wasStatus: capacityStatus(w.occ) as CapacityStatus };
    })
    .sort((a, b) => b.after - a.after);
}

/**
 * Three executive KPI cards:
 *  1. Capacity shift  – beds impacted vs. absorbed by partner wards
 *  2. Occupancy risk  – wards at/above 85 % (warning) and 95 % (critical)
 *  3. Financial impact – net yearly saving or cost
 */
export function KpiSummary({ wards, result }: { wards: Ward[]; result: ScenarioResult }) {
  // 1. Capacity shift
  const absorbedPct = result.bedsImpacted ? Math.round((result.bedsAbsorbed / result.bedsImpacted) * 100) : 100;
  const capTone = result.unabsorbed === 0 ? "good" : result.unabsorbed / Math.max(1, result.displaced) <= 0.1 ? "warn" : "bad";

  // 2. Occupancy risk
  const risks = riskWards(wards, result);
  const critical = risks.filter((r) => r.status === "critical");
  const warn = risks.filter((r) => r.status === "warn");
  const wasAtRisk = risks.filter((r) => r.wasStatus !== "ok").length;
  const riskTone = critical.length || result.unabsorbed > 0 ? "bad" : warn.length ? "warn" : "good";

  // 3. Financial
  const fin = result.netSaving;

  const travelTone = result.weightedTravel > 30 ? "text-gap" : result.weightedTravel > 20 ? "text-watch" : "text-par";
  const stats: { label: string; value: string; cls: string }[] = [
    { label: "Moved (displaced)", value: formatInt(result.displaced), cls: "text-ink" },
    { label: "Absorbed", value: formatInt(result.absorbed), cls: result.absorbed === result.displaced ? "text-par" : "text-watch" },
    { label: "Without a bed", value: formatInt(result.unabsorbed), cls: result.unabsorbed ? "text-gap" : "text-par" },
    { label: "Increase in travel", value: `+${Math.round(result.weightedTravel)} min`, cls: travelTone },
    { label: "Net yearly saving", value: formatEuroSigned(result.netSaving), cls: result.netSaving < 0 ? "text-gap" : "text-par" },
  ];

  return (
    <div className="space-y-4" role="region" aria-label="Key figures for this scenario" aria-live="polite">
    <div className="stagger grid gap-4 md:grid-cols-3">
      <KpiCard title="Capacity shift" value={`${formatInt(result.bedsAbsorbed)} of ${formatInt(result.bedsImpacted)} beds`} tone={capTone}>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-100" role="img" aria-label={`${absorbedPct}% of impacted beds absorbed by partner wards`}>
            <div className={`h-full rounded-full ${BAR[capTone]}`} style={{ width: `${Math.min(100, absorbedPct)}%` }} />
          </div>
          <p className="mt-1.5">{absorbedPct}% of impacted beds absorbed by partner wards</p>
        </div>
        <p>{formatInt(result.absorbed)} of {formatInt(result.displaced)} admissions a year find a bed{result.unabsorbed > 0 && <strong className="text-gap"> · {formatInt(result.unabsorbed)} without a bed</strong>}</p>
      </KpiCard>

      <KpiCard
        title="Occupancy risk"
        value={critical.length + warn.length === 0 ? "No ward at risk" : `${critical.length + warn.length} ${critical.length + warn.length === 1 ? "ward" : "wards"} at risk`}
        tone={riskTone}
      >
        <ul className="flex flex-wrap gap-1.5">
          <li className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_META.critical.chip}`}>✕ {critical.length} over capacity (≥ 95 %)</li>
          <li className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_META.warn.chip}`}>! {warn.length} near capacity (≥ 85 %)</li>
        </ul>
        <p>
          {critical.length + warn.length > 0
            ? <>Highest: <strong className="text-ink">{risks[0].ward.short} {Math.round(risks[0].after * 100)}%</strong>. </>
            : null}
          {wasAtRisk} {wasAtRisk === 1 ? "ward is" : "wards are"} at risk today.
        </p>
      </KpiCard>

      <KpiCard title="Financial & resource impact" value={`${fin < 0 ? "Net cost " : "Net saving "}${formatEuroSigned(Math.abs(fin))}`} tone={fin < 0 ? "bad" : "good"}>
        <p>per year, after staff and transfer costs</p>
        <p className="text-xs">
          Facility {formatEuro(result.facilitySaving)} · staff {formatEuroSigned(result.staffNet)} · transfers −{formatEuro(result.marginal)}
        </p>
      </KpiCard>
    </div>

    {/* Compact strip with the five headline numbers (admissions per year) */}
    <dl className="stagger grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-5">
      {stats.map((x) => (
        <div key={x.label} className="bg-surface px-4 py-3">
          <dt className="text-xs text-muted">{x.label}</dt>
          <dd className={`font-display text-3xl leading-tight tabular-nums ${x.cls}`}><AnimatedValue text={x.value} /></dd>
        </div>
      ))}
    </dl>
    </div>
  );
}
