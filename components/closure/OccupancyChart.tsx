"use client";
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "@/components/charts/theme";

/** Before / after occupancy of the receiving wards, with the occupancy cap as a red line. */
export function OccupancyChart({ data, cap }: { data: { name: string; before: number; after: number }[]; cap: number }) {
  return (
    <div role="img" aria-label={`Bar chart of occupancy before and after at receiving wards; cap ${cap}%`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 12, right: 24, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} unit="%" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} cursor={{ fill: "#eef6ff" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={cap} stroke="#e5484d" strokeDasharray="4 3" label={{ value: `cap ${cap}%`, fill: "#e5484d", fontSize: 11, position: "right" }} />
          <Bar dataKey="before" name="Occupancy before" fill={CHART.bench} radius={[6, 6, 0, 0]} />
          <Bar dataKey="after" name="Occupancy after" fill={CHART.brand} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
