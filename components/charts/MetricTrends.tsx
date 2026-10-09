"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "./theme";
import { METRIC_BY_KEY, SCORED_METRICS } from "@/lib/domain/metrics";
import { formatPeriod } from "@/lib/format";
import type { Benchmark, ScoredKey, Snapshot } from "@/lib/domain/types";

export function MetricTrends({ history, benchmark }: { history: Snapshot[]; benchmark: Benchmark }) {
  const [key, setKey] = useState<ScoredKey>("occupancy");
  const m = METRIC_BY_KEY[key];
  const data = history.map((h) => ({ period: formatPeriod(h.period), value: h[key] }));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SCORED_METRICS.map((x) => (
          <button key={x.key} onClick={() => setKey(x.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${x.key === key ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}>
            {x.short}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="period" tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={["auto", "auto"]} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ${m.unit}`, m.label]} />
          <ReferenceLine y={benchmark[key]} stroke={CHART.bench} strokeDasharray="5 4"
            label={{ value: `Benchmark ${benchmark[key]}`, position: "insideTopRight", fill: CHART.axis, fontSize: 11 }} />
          <Line type="monotone" dataKey="value" stroke={CHART.brand} strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted">{m.label} ({m.unit}) — {m.direction === "higher" ? "higher is better" : "lower is better"}. {m.definition}</p>
    </div>
  );
}
