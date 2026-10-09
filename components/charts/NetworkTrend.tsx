"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "./theme";
import { formatPeriod } from "@/lib/format";

export function NetworkTrend({ periods, series }: { periods: string[]; series: { name: string; values: (number | null)[] }[] }) {
  const data = periods.map((p, i) => ({ period: formatPeriod(p), ...Object.fromEntries(series.map((s) => [s.name, s.values[i] == null ? null : Math.round(s.values[i]!)])) }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="period" tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[40, 110]} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
        <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => v.split(" – ")[0]} />
        <ReferenceLine y={100} stroke={CHART.bench} strokeDasharray="4 4" />
        {series.map((s, i) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={CHART.series[i % CHART.series.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
