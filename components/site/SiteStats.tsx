"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { CHART, tooltipStyle } from "@/components/charts/theme";
import { formatCompact, formatEuroCompact, formatInt, formatPeriod } from "@/lib/format";
import type { SiteStats as Stats } from "@/lib/domain/types";

const axis = { fill: CHART.axis, fontSize: 12 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
const COST_LABEL: Record<string, string> = {
  cleaning: "Cleaning", maintenance: "Maintenance", utilities: "Utilities", security: "Security",
  facility_management: "Facility mgmt", rent_leasing: "Rent & leasing",
};

/** Detail statistics from the database (departments, activity, operating rooms, costs, catchment) for one site. */
export function SiteStats({ slug }: { slug: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/sites/${slug}/stats`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Stats) => live && setStats(d))
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [slug]);

  if (error) return <Card title="Detail statistics"><p className="text-sm text-gap">Could not load detail statistics ({error}).</p></Card>;
  if (!stats) return <Card title="Detail statistics"><p className="text-sm text-muted">Loading…</p></Card>;
  if (!stats.monthly.length) return null; // site without detail data (e.g. entered through the form)

  const monthly = stats.monthly.slice(-24).map((m) => ({ ...m, label: monthLabel(m.month) }));
  const periods = [...new Set(stats.costs.map((c) => c.period))];
  const costData = periods.map((p) => ({
    period: formatPeriod(p),
    ...Object.fromEntries(stats.costs.filter((c) => c.period === p).map((c) => [c.category, c.amountEur])),
  }));
  const categories = [...new Set(stats.costs.map((c) => c.category))];
  const latestDeptPeriod = stats.departments.reduce((m, d) => (d.period > m ? d.period : m), "");
  const depts = stats.departments.filter((d) => d.period === latestDeptPeriod);
  const or = stats.operatingRooms[stats.operatingRooms.length - 1];
  const year = Math.max(...stats.flows.map((f) => f.year));
  const flows = stats.flows.filter((f) => f.year === year);
  const flowTotal = flows.reduce((n, f) => n + f.patients, 0);
  const last12 = stats.monthly.slice(-12);
  const sum = (k: "admissions" | "edVisits" | "surgeries") => last12.reduce((n, m) => n + m[k], 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Admissions" value={formatCompact(sum("admissions"))} hint="last 12 months" />
        <Kpi label="ED visits" value={formatCompact(sum("edVisits"))} hint="last 12 months" />
        <Kpi label="Surgeries" value={formatCompact(sum("surgeries"))} hint="last 12 months" />
        {or && <Kpi label="OR cancellations" value={`${or.cancellationPct}%`} hint={`${or.rooms} rooms · ${formatPeriod(or.period)} · turnover ${formatInt(or.turnoverMin)} min`} />}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Monthly activity" subtitle="Admissions, ED visits and surgeries — last 24 months">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthly} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
              <Tooltip {...tooltipStyle} formatter={(v) => formatInt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="admissions" name="Admissions" stroke={CHART.series[0]} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="edVisits" name="ED visits" stroke={CHART.series[2]} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="surgeries" name="Surgeries" stroke={CHART.series[1]} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Facility cost by category" subtitle="€ per quarter">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="period" tick={axis} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => formatEuroCompact(v)} />
              <Tooltip {...tooltipStyle} formatter={(v) => formatEuroCompact(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => COST_LABEL[v] ?? v} />
              {categories.map((c, i) => <Bar key={c} dataKey={c} stackId="cost" fill={CHART.series[i % CHART.series.length]} />)}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Departments" subtitle={`${formatPeriod(latestDeptPeriod)} · occupancy, length of stay and staffing`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-sm">
              <thead><tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Department</th><th className="pb-2 text-right font-medium">Beds</th><th className="pb-2 text-right font-medium">Occ.</th>
                <th className="pb-2 text-right font-medium">LOS</th><th className="pb-2 text-right font-medium">Admiss.</th><th className="pb-2 text-right font-medium">Nurses/bed</th>
              </tr></thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.code} className="border-t border-line">
                    <td className="py-2 font-medium">{d.name}</td>
                    <td className="py-2 text-right tabular-nums">{d.beds}</td>
                    <td className="py-2 text-right tabular-nums">{d.occupancy}%</td>
                    <td className="py-2 text-right tabular-nums">{d.avgLosDays} d</td>
                    <td className="py-2 text-right tabular-nums">{formatInt(d.admissions)}</td>
                    <td className="py-2 text-right tabular-nums">{(d.nurseFte / d.beds).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Where patients come from" subtitle={`${year} · share of inpatients and average travel time per municipality`}>
          <div className="space-y-2">
            {flows.map((f) => (
              <div key={f.municipality} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
                <span className="truncate font-medium">{f.municipality}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(f.patients / flows[0].patients) * 100}%` }} /></div>
                <span className="text-right tabular-nums text-muted">{((f.patients / flowTotal) * 100).toFixed(1)}% · {formatInt(f.avgTravelMin)} min</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
