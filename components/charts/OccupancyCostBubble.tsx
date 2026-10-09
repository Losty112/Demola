"use client";
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { CHART } from "./theme";
import { STATUS_COLOR } from "@/components/ui/StatusChip";
import type { StatusKey } from "@/lib/domain/types";

export interface BubbleDatum { name: string; occupancy: number; cost: number; beds: number; status: StatusKey }

export function OccupancyCostBubble({ data, benchOccupancy, benchCost }: { data: BubbleDatum[]; benchOccupancy: number; benchCost: number }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 12, right: 24, bottom: 24, left: 8 }}>
        <CartesianGrid stroke={CHART.grid} />
        <XAxis type="number" dataKey="occupancy" name="Occupancy" unit="%" domain={[40, 100]} tick={{ fill: CHART.axis, fontSize: 12 }}
          label={{ value: "Bed occupancy (%)", position: "insideBottom", offset: -12, fill: CHART.axis, fontSize: 12 }} />
        <YAxis type="number" dataKey="cost" name="Cost" unit=" €" domain={[240, 400]} tick={{ fill: CHART.axis, fontSize: 12 }}
          label={{ value: "Facility cost (€/m²/yr)", angle: -90, position: "insideLeft", fill: CHART.axis, fontSize: 12 }} />
        <ZAxis type="number" dataKey="beds" range={[160, 1400]} name="Beds" />
        <ReferenceArea x1={benchOccupancy} x2={100} y1={240} y2={benchCost} fill="#12a37a" fillOpacity={0.07} />
        <ReferenceLine x={benchOccupancy} stroke={CHART.bench} strokeDasharray="4 4" />
        <ReferenceLine y={benchCost} stroke={CHART.bench} strokeDasharray="4 4" />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
          const d = payload?.[0]?.payload as BubbleDatum | undefined;
          if (!d) return null;
          return (
            <div className="rounded-xl border border-line bg-white p-2.5 text-xs shadow-card">
              <div className="font-semibold">{d.name}</div>
              <div>Occupancy {d.occupancy}% · Cost €{d.cost}/m² · {d.beds} beds</div>
            </div>
          );
        }} />
        <Scatter data={data} shape={(p: unknown) => {
          const { cx, cy, node, payload } = p as { cx: number; cy: number; node: { z?: number }; payload: BubbleDatum };
          const r = Math.sqrt((node?.z ?? 400) / Math.PI);
          return (
            <g>
              <circle cx={cx} cy={cy} r={r} fill={STATUS_COLOR[payload.status]} fillOpacity={0.35} stroke={STATUS_COLOR[payload.status]} strokeWidth={2} />
              <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize={11} fill={CHART.navy}>{payload.name.split(" – ")[0]}</text>
            </g>
          );
        }} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
