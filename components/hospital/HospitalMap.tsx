"use client";
import { useMemo } from "react";
import { MAP_ATTRIBUTION, TILE_FILTER, tileUrl, tilesCovering, zoomFor } from "@/lib/closure/geo";

export interface MapPoint {
  id: string;
  label: string;
  /** One or two characters drawn inside the circle (e.g. "A"); the full label shows when selected */
  short?: string;
  lat: number;
  lon: number;
  /** Circle area grows with this (e.g. beds); 0 = hospital has no such ward (drawn as a small ring) */
  size: number;
  color: string;
  /** Short text inside / next to the circle when focused */
  detail: string;
  own?: boolean;
}

/** Rounded to 0.1 px: Node and the browser differ in the last float digits, which would break hydration. */
const px = (v: number) => Math.round(v * 10) / 10;
const W = 640, H = 420, PAD = 34;

/** Same projection as the closure map, fitted to the given points, with dark street tiles behind. */
function projector(points: MapPoint[]) {
  const lats = points.map((p) => p.lat), lons = points.map((p) => p.lon);
  const latMin = Math.min(...lats) - 0.012, latMax = Math.max(...lats) + 0.012;
  const lonMin = Math.min(...lons) - 0.03, lonMax = Math.max(...lons) + 0.03;
  const kmLat = 111, kmLon = 111 * Math.cos(((latMin + latMax) / 2) * Math.PI / 180);
  const scale = Math.min((W - 2 * PAD) / ((lonMax - lonMin) * kmLon), (H - 2 * PAD) / ((latMax - latMin) * kmLat));
  const offX = PAD + (W - 2 * PAD - (lonMax - lonMin) * kmLon * scale) / 2;
  const offY = PAD + (H - 2 * PAD - (latMax - latMin) * kmLat * scale) / 2;
  const project = (lat: number, lon: number): [number, number] => [offX + (lon - lonMin) * kmLon * scale, offY + (latMax - lat) * kmLat * scale];
  const unproject = (x: number, y: number) => ({ lon: lonMin + (x - offX) / (kmLon * scale), lat: latMax - (y - offY) / (kmLat * scale) });
  return { project, unproject, pxPerDegLon: kmLon * scale };
}

/**
 * Map of hospitals. Circle size = the chosen figure, colour = its status. Click (or Enter) a hospital to select it.
 * Labels stay short; the detail line appears for the selected hospital only.
 */
export function HospitalMap({ points, selectedId, onSelect, title, maxSize }: {
  points: MapPoint[]; selectedId: string | null; onSelect: (id: string | null) => void; title: string; maxSize?: number;
}) {
  // The projection depends only on where the hospitals are, not on the chosen figure
  const key = points.map((p) => `${p.lat},${p.lon}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { project, unproject, pxPerDegLon } = useMemo(() => projector(points), [key]);
  const tiles = useMemo(() => {
    const nw = unproject(0, 0), se = unproject(W, H);
    return tilesCovering({ north: nw.lat, south: se.lat, west: nw.lon, east: se.lon }, zoomFor(pxPerDegLon));
  }, [unproject, pxPerDegLon]);
  const top = maxSize ?? Math.max(1, ...points.map((p) => p.size));
  const r = (size: number) => (size <= 0 ? 6 : 9 + Math.sqrt(size / top) * 13);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-night" role="group" aria-label={title}>
      <g aria-hidden="true">
        <rect width={W} height={H} fill="#07101f" />
        {tiles.map((t) => {
          const [x0, y0] = project(t.north, t.west), [x1, y1] = project(t.south, t.east);
          return <image key={`${t.z}/${t.x}/${t.y}`} href={tileUrl(t)} x={px(x0)} y={px(y0)} width={px(x1 - x0 + 0.6)} height={px(y1 - y0 + 0.6)} preserveAspectRatio="none" opacity={0.85} style={{ filter: TILE_FILTER }} />;
        })}
        <rect width={W} height={H} fill="#04070d" opacity={0.32} />
        <text x={W - 8} y={H - 7} textAnchor="end" fontSize={9} fill="#9aa7ba">{MAP_ATTRIBUTION}</text>
      </g>
      {[...points].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : b.size - a.size)).map((p) => {
        const [x, y] = project(p.lat, p.lon);
        const rr = r(p.size);
        const sel = selectedId === p.id;
        return (
          <g key={p.id} role="button" tabIndex={0} aria-pressed={sel} aria-label={`${p.label}: ${p.detail}`} className="cursor-pointer outline-none"
            onClick={() => onSelect(sel ? null : p.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(sel ? null : p.id); } }}>
            <circle cx={x} cy={y} r={Math.max(rr + 6, 16)} fill="transparent" />
            {sel && <circle cx={x} cy={y} r={rr + 5} fill="none" stroke="#8dbfff" strokeWidth={2.5} />}
            {p.size <= 0
              ? <circle cx={x} cy={y} r={rr} fill="#04070d" stroke="#9aa7ba" strokeWidth={1.5} strokeDasharray="3 2" />
              : <circle cx={x} cy={y} r={rr} fill={p.color} fillOpacity={0.9} stroke={p.own ? "#ffffff" : "#04070d"} strokeWidth={p.own ? 3 : 1.5} style={{ transition: "r .5s ease, fill .5s ease" }} />}
            <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff" pointerEvents="none" style={{ paintOrder: "stroke", stroke: "#04070d", strokeWidth: 2.5 }}>{p.own ? "★" : p.short ?? ""}</text>
          </g>
        );
      })}
      {/* Labels in a second pass so no circle ever covers a name. The own hospital's name sits above its marker. */}
      {points.map((p) => {
        const sel = selectedId === p.id;
        if (!sel && !p.own) return null;
        const [x, y] = project(p.lat, p.lon);
        const rr = r(p.size);
        const left = x > W * 0.68;
        const tx = left ? x - rr - 6 : x + rr + 6;
        const anchor = left ? "end" : "start";
        const halo = { paintOrder: "stroke", stroke: "#04070d", strokeWidth: 3.5 } as const;
        return (
          <g key={`label-${p.id}`} pointerEvents="none">
            {sel
              ? <text x={tx} y={y + 4} textAnchor={anchor} fontSize={12} fontWeight={700} fill="#fff" style={halo}>{p.own ? "Your hospital" : p.label}</text>
              : <text x={x} y={y - rr - 9} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff" style={halo}>Your hospital</text>}
            {sel && <text x={tx} y={y + 19} textAnchor={anchor} fontSize={10.5} fill="#c9d3e3" style={halo}>{p.detail}</text>}
          </g>
        );
      })}
    </svg>
  );
}
