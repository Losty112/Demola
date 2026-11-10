"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusChip } from "@/components/ui/StatusChip";
import { CHART } from "@/components/charts/theme";
import { ActionPlan } from "../ActionPlan";
import { MonthlyBars, MonthlyLine } from "../charts";
import { NeedsData, PageShell, RequireProfile } from "../shell";
import { pressures, type Area } from "@/lib/hospital/pressure";
import type { Reference } from "@/lib/db/repository";
import type { ScenarioInput } from "@/lib/domain/types";

const AREA_ICON: Record<Area, IconName> = { beds: "bed", staff: "doctor", cost: "euro", energy: "bolt" };
const TONE = { par: "border-par/40 solid-par", watch: "border-watch/45 solid-watch", gap: "border-gap/45 solid-gap" } as const;
const ICON_TONE = { par: "text-par", watch: "text-watch", gap: "text-gap" } as const;

/** Your hospital: pressure overview (links to the other pages) → action plan → how the hospital did over time. */
export function MyHospital({ reference, scenario }: { reference: Reference; scenario: ScenarioInput }) {
  return (
    <PageShell title="My hospital" icon="hospital" intro="Where your hospital is under pressure right now, what to do about it, and how it went over the last 12 months.">
      <RequireProfile>
        {(s) => {
          const v = s.view;
          const ps = pressures(v, reference.benchmark, reference.settings);
          return (
            <>
              <section aria-labelledby="pressure-title" className="space-y-3">
                <h2 id="pressure-title" className="text-sm font-semibold uppercase tracking-wide text-muted">Under pressure?</h2>
                <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {ps.map((p) => (
                    <Link key={p.area} href={p.status ? p.href : `/upload?dataset=${p.needs.find((d) => !v.has[d]) ?? p.needs[0]}`}
                      className={`glass group block rounded-2xl border p-4 shadow-card focus-visible:outline-2 focus-visible:outline-brand-500 ${p.status ? TONE[p.status] : "border-dashed border-line bg-surface"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex items-center gap-2 text-sm font-semibold ${p.status ? ICON_TONE[p.status] : "text-muted"}`}>
                          <Icon name={AREA_ICON[p.area]} className="h-6 w-6" /> {p.title}
                        </span>
                        {p.status ? <StatusChip status={p.status} /> : <span className="text-xs text-muted">no data</span>}
                      </div>
                      <div className="mt-3 text-lg font-semibold leading-snug text-ink">{p.headline}</div>
                      <div className="mt-1 text-xs text-muted">{p.detail}</div>
                      <div className="mt-3 text-xs font-medium text-brand-600 group-hover:underline">{p.status ? "Open details →" : "Upload data →"}</div>
                    </Link>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[{ href: "/patients", l: "Patients", i: "person" }, { href: "/compare", l: "Compare wards", i: "compare" }, { href: "/benchmark", l: "Benchmark hospital", i: "layers" }].map((x) => (
                    <Link key={x.href} href={x.href} className="flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1.5 font-medium text-brand-700 hover:bg-brand-50">
                      <Icon name={x.i as IconName} className="h-4 w-4" /> {x.l}
                    </Link>
                  ))}
                </div>
              </section>

              {v.snapshot
                ? <ActionPlan snapshot={v.snapshot} benchmark={reference.benchmark} settings={reference.settings} scenario={scenario} />
                : <NeedsData needs={v.snapshotNeeds} what="The action plan" />}

              <section aria-labelledby="time-title" className="space-y-3">
                <h2 id="time-title" className="text-sm font-semibold uppercase tracking-wide text-muted">How the hospital did over time</h2>
                <div className="grid gap-5 xl:grid-cols-2">
                  {v.has.patients ? (
                    <Card title="Patients served" subtitle="Admissions per month, planned and emergency">
                      <MonthlyBars unit="patients" data={v.months.map((m) => ({ month: m.month, planned: m.admissions === null ? null : m.admissions - (m.emergency ?? 0), emergency: m.emergency }))}
                        series={[{ key: "planned", label: "Planned", color: CHART.brand, stack: "a" }, { key: "emergency", label: "Emergency", color: "#e5484d", stack: "a" }]} />
                    </Card>
                  ) : <NeedsData needs={["patients"]} what="The patients chart" />}
                  {v.has.energy ? (
                    <Card title="Electricity consumption" subtitle="kWh per month, whole hospital">
                      <MonthlyLine data={v.months.map((m) => ({ month: m.month, electricity: m.electricity }))} dataKey="electricity" label="Electricity" unit="kWh" color="#e8920f" />
                    </Card>
                  ) : <NeedsData needs={["energy"]} what="The electricity chart" />}
                </div>
              </section>
            </>
          );
        }}
      </RequireProfile>
    </PageShell>
  );
}
