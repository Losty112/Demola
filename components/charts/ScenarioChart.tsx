"use client";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "./theme";
import { formatEuroCompact, formatInt } from "@/lib/format";

export interface ScenarioDatum { name: string; saving: number; patients: number }

export function ScenarioChart({ data }: { data: ScenarioDatum[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[
        { key: "saving" as const, title: "Yearly saving", color: "#12a37a", fmt: (v: number) => formatEuroCompact(v) },
        { key: "patients" as const, title: "Patients affected per year", color: "#e5484d", fmt: (v: number) => formatInt(v) },
      ].map((c) => (
        <div key={c.key}>
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{c.title}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip {...tooltipStyle} formatter={(v) => c.fmt(Number(v))} cursor={{ fill: "#eef6ff" }} />
              <Bar dataKey={c.key} radius={[8, 8, 0, 0]} barSize={36}>
                {data.map((d) => <Cell key={d.name} fill={c.color} fillOpacity={0.85} />)}
                <LabelList dataKey={c.key} position="top" formatter={(v) => c.fmt(Number(v))} fill={CHART.navy} fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
