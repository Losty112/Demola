"use client";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART, tooltipStyle } from "./theme";
import { SCORED_METRICS } from "@/lib/domain/metrics";
import type { Analysis } from "@/lib/domain/types";

export interface RadarSeries { name: string; analysis: Analysis }

/** Scores are % of benchmark; the benchmark hospital is the dashed ring at 100. */
export function SiteRadar({ series, height = 380 }: { series: RadarSeries[]; height?: number }) {
  const data = SCORED_METRICS.map((m, i) => ({
    metric: m.short,
    Benchmark: 100,
    ...Object.fromEntries(series.map((s) => [s.name, Math.round(s.analysis.scores[i].score)])),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={CHART.grid} />
        <PolarAngleAxis dataKey="metric" tick={{ fill: CHART.navy, fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 150]} tickCount={4} tick={false} axisLine={false} />
        <Radar name="Benchmark = 100" dataKey="Benchmark" stroke={CHART.bench} strokeDasharray="5 4" fill="none" strokeWidth={1.5} />
        {series.map((s, i) => (
          <Radar key={s.name} name={s.name} dataKey={s.name} stroke={CHART.series[i % CHART.series.length]} fill={CHART.series[i % CHART.series.length]} fillOpacity={series.length > 1 ? 0.12 : 0.28} strokeWidth={2.5} />
        ))}
        <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
