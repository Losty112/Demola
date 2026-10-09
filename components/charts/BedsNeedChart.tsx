"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "./theme";

export interface BedsDatum { name: string; needed: number; surplus: number }

export function BedsNeedChart({ data }: { data: BedsDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="name" tickFormatter={(v: string) => v.split(" – ")[0]} tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: CHART.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "#eef6ff" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="needed" name="Beds needed at benchmark occupancy" stackId="b" fill={CHART.brand} radius={[0, 0, 0, 0]} />
        <Bar dataKey="surplus" name="Beds above need" stackId="b" fill={CHART.brandLight} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
