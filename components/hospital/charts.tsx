"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, tooltipStyle } from "@/components/charts/theme";
import { formatCompact, formatInt } from "@/lib/format";
import { monthLabel } from "@/lib/hospital/period";

const axis = { tick: { fill: CHART.axis, fontSize: 12 }, axisLine: false, tickLine: false } as const;

export interface Series { key: string; label: string; color: string; stack?: string }

/** Monthly bars (optionally stacked) over the 12-month period. Missing months show as gaps. */
export function MonthlyBars({ data, series, unit, height = 260 }: { data: ({ month: string } & Record<string, number | string | null>)[]; series: Series[]; unit: string; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={52} tickFormatter={(v) => formatCompact(Number(v))} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v, name) => [`${formatInt(Number(v))} ${unit}`, name]} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={s.stack} radius={!s.stack || i === series.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Monthly line with an optional reference line. */
export function MonthlyLine({ data, dataKey, label, unit, color = CHART.brand, reference, height = 260 }: {
  data: ({ month: string } & Record<string, number | string | null>)[]; dataKey: string; label: string; unit: string; color?: string; reference?: { value: number; label: string }; height?: number;
}) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={52} domain={["auto", "auto"]} tickFormatter={(v) => formatCompact(Number(v))} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${formatInt(Number(v))} ${unit}`, label]} />
        {reference && <ReferenceLine y={reference.value} stroke={CHART.bench} strokeDasharray="5 4" label={{ value: reference.label, position: "insideTopRight", fill: CHART.axis, fontSize: 11 }} />}
        <Line type="monotone" dataKey={dataKey} name={label} stroke={color} strokeWidth={3} dot={{ r: 3.5, fill: "#04070d", strokeWidth: 2 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** One horizontal bar per ward; the selected ward is highlighted and bars are clickable. */
export function WardBars({ data, unit, format = (v) => formatInt(v), reference, selected, onSelect, colorOf }: {
  data: { code: string; name: string; value: number }[]; unit: string; format?: (v: number) => string;
  reference?: { value: number; label: string }; selected?: string | null; onSelect?: (code: string) => void; colorOf?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34 + 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis type="number" {...axis} tickFormatter={(v) => format(Number(v))} />
        <YAxis type="category" dataKey="name" {...axis} width={170} tick={{ fill: "#dbe3ef", fontSize: 12 }} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v) => [`${format(Number(v))} ${unit}`.trim(), ""]} />
        {reference && <ReferenceLine x={reference.value} stroke={CHART.bench} strokeDasharray="5 4" label={{ value: reference.label, position: "top", fill: CHART.axis, fontSize: 11 }} />}
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} onClick={(d) => onSelect?.((d as unknown as { code: string }).code)} cursor={onSelect ? "pointer" : undefined}
          label={{ position: "right", fill: CHART.axis, fontSize: 11, formatter: (v: unknown) => format(Number(v)) }}>
          {data.map((d) => (
            <Cell key={d.code} fill={colorOf ? colorOf(d.value) : CHART.brand} fillOpacity={!selected || selected === d.code ? 1 : 0.35} stroke={selected === d.code ? "#fff" : undefined} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked horizontal bars: spending per ward split into staff, medicines, building, energy. */
export const COST_SERIES: Series[] = [
  { key: "staff", label: "Staff", color: "#2b7de9", stack: "c" },
  { key: "medicines", label: "Medicines", color: "#8a5cf6", stack: "c" },
  { key: "building", label: "Building", color: "#7d8ca3", stack: "c" },
  { key: "energy", label: "Energy", color: "#e8920f", stack: "c" },
];

export function CostSplitBars({ data, selected, onSelect }: { data: { code: string; name: string; staff: number; medicines: number; building: number; energy: number }[]; selected?: string | null; onSelect?: (code: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34 + 60)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={CHART.grid} />
        <XAxis type="number" {...axis} tickFormatter={(v) => `€${formatCompact(Number(v))}`} />
        <YAxis type="category" dataKey="name" {...axis} width={170} tick={{ fill: "#dbe3ef", fontSize: 12 }} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.05)" }} formatter={(v, name) => [`€${formatInt(Number(v))}`, name]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {COST_SERIES.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="c" fill={s.color} maxBarSize={22} radius={i === COST_SERIES.length - 1 ? [0, 4, 4, 0] : 0}
            onClick={(d) => onSelect?.((d as unknown as { code: string }).code)} cursor={onSelect ? "pointer" : undefined}>
            {data.map((d) => <Cell key={d.code} fillOpacity={!selected || selected === d.code ? 1 : 0.35} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
