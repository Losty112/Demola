"use client";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "./theme";
import { STATUS_COLOR } from "@/components/ui/StatusChip";
import type { StatusKey } from "@/lib/domain/types";

export interface RankingDatum { name: string; average: number; status: StatusKey }

export function NetworkRanking({ data }: { data: RankingDatum[] }) {
  const sorted = [...data].sort((a, b) => b.average - a.average);
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, sorted.length * 48)}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 36, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis type="number" domain={[0, 120]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: CHART.axis, fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fill: CHART.navy, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${Math.round(Number(v))}% of benchmark`, "Average"]} cursor={{ fill: "#eef6ff" }} />
        <ReferenceLine x={100} stroke={CHART.bench} strokeDasharray="4 4" label={{ value: "Benchmark", position: "top", fill: CHART.axis, fontSize: 11 }} />
        <Bar dataKey="average" radius={[0, 8, 8, 0]} barSize={22}>
          {sorted.map((d) => <Cell key={d.name} fill={STATUS_COLOR[d.status]} />)}
          <LabelList dataKey="average" position="right" formatter={(v) => `${Math.round(Number(v))}%`} fill={CHART.navy} fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
