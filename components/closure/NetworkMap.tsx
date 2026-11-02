"use client";
import { useMemo } from "react";
import { MAP_ATTRIBUTION, tileUrl, tilesCovering, zoomFor } from "@/lib/closure/geo";
import type { ScenarioResult, Ward } from "@/lib/closure/types";
import { STATUS_META, capacityStatus } from "@/lib/closure/status";
import { formatInt } from "@/lib/format";
import { FOCUS } from "./ui";

export type MapView = "baseline" | "after";

const W = 640;
const H = 440;
const PAD = 26;
const radius = (beds: number) => 4 + Math.sqrt(beds) * 1.2;

/** Equirectangular projection fitted into the SVG box (same maths as the original preview). */
function makeProjector(wards: Ward[]) {
  const lats = wards.map((w) => w.lat);
  const lons = wards.map((w) => w.lon);
  const latMin = Math.min(...lats) - 0.01, latMax = Math.max(...lats) + 0.01;
  const lonMin = Math.min(...lons) - 0.03, lonMax = Math.max(...lons) + 0.03;
  const kmLat = 111;
  const kmLon = 111 * Math.cos(((latMin + latMax) / 2 * Math.PI) / 180);
  const scale = Math.min((W - 2 * PAD) / ((lonMax - lonMin) * kmLon), (H - 2 * PAD) / ((latMax - latMin) * kmLat));
  const offX = PAD + (W - 2 * PAD - (lonMax - lonMin) * kmLon * scale) / 2;
  const offY = PAD + (H - 2 * PAD - (latMax - latMin) * kmLat * scale) / 2;
  const project = (lat: number, lon: number): [number, number] => [offX + (lon - lonMin) * kmLon * scale, offY + (latMax - lat) * kmLat * scale];
  const unproject = (x: number, y: number) => ({ lon: lonMin + (x - offX) / (kmLon * scale), lat: latMax - (y - offY) / (kmLat * scale) });
  return { project, unproject, pxPerDegLon: kmLon * scale };
}

/**
 * Simplified regional ward map.
 *  - Circle colour = capacity status (green / yellow / red) for the chosen view.
 *  - Only the ward name is printed; occupancy and details appear for the focused ward.
 *  - Patient-flow arrows are drawn ON DEMAND: for the focused ward (hover, keyboard focus or
 *    click) or for every ward when `showAllFlows` is on. They never show in the baseline view.
 */
export function NetworkMap({ wards, result, view, focusId, onFocus, onSelect, selectedId, showAllFlows, compact = false, title }: {
  wards: Ward[];
  result: ScenarioResult;
  view: MapView;
  /** Ward currently hovered / focused / selected (drives the flows) */
  focusId: string | null;
  onFocus: (id: string | null) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  showAllFlows: boolean;
  compact?: boolean;
  title: string;
}) {
  const { project, unproject, pxPerDegLon } = useMemo(() => makeProjector(wards), [wards]);
  // Map background: real tiles covering the whole drawing area, placed with the same projection as the wards
  const tiles = useMemo(() => {
    const nw = unproject(0, 0), se = unproject(W, H);
    return tilesCovering({ north: nw.lat, south: se.lat, west: nw.lon, east: se.lon }, zoomFor(pxPerDegLon));
  }, [unproject, pxPerDegLon]);
  const maxTotal = Math.max(1, ...result.used.map((u) => u.total));
  const [sx, sy] = project(result.src.lat, result.src.lon);
  const isAfter = view === "after";
  const closed = result.cfg.type === "close";

  const occOf = (w: Ward) => (isAfter ? result.used.find((u) => u.site.id === w.id)?.occAfter ?? w.occ : w.occ);

  // Which flows are visible?
  const flows = !isAfter ? [] : result.used.filter((u) => showAllFlows || focusId === result.src.id || focusId === u.site.id);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-night" role="group" aria-label={title}
      onMouseLeave={() => onFocus(null)}>
      <defs>
        <marker id={`arrow-${view}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L10,5 L0,10 z" fill="#8dbfff" />
        </marker>
      </defs>

      {/* Map background: dark street map under a dim layer so the wards stay the focus */}
      <g aria-hidden="true">
        <rect width={W} height={H} fill="#07101f" />
        {tiles.map((t) => {
          const [x0, y0] = project(t.north, t.west), [x1, y1] = project(t.south, t.east);
          return <image key={`${t.z}/${t.x}/${t.y}`} href={tileUrl(t)} x={x0} y={y0} width={x1 - x0 + 0.6} height={y1 - y0 + 0.6} preserveAspectRatio="none" opacity={0.9} />;
        })}
        <rect width={W} height={H} fill="#04070d" opacity={0.28} />
        <text x={W - 8} y={H - 7} textAnchor="end" fontSize={9} fill="#9aa7ba">{MAP_ATTRIBUTION}</text>
      </g>

      {/* Flow arrows (on demand) */}
      {flows.map((u) => {
        const [px, py] = project(u.site.lat, u.site.lon);
        const dx = px - sx, dy = py - sy, len = Math.hypot(dx, dy) || 1;
        const r = radius(u.site.beds);
        return (
          <line key={u.site.id} x1={sx + (dx / len) * 14} y1={sy + (dy / len) * 14} x2={px - (dx / len) * (r + 3)} y2={py - (dy / len) * (r + 3)}
            stroke="#5a9fff" strokeOpacity={0.9} className="flow-line" strokeWidth={2 + (compact ? 6 : 9) * (u.total / maxTotal)} markerEnd={`url(#arrow-${view})`} pointerEvents="none" />
        );
      })}

      {wards.map((w) => {
        const [x, y] = project(w.lat, w.lon);
        const r = radius(w.beds);
        const isSrc = w.id === result.src.id;
        const status = capacityStatus(occOf(w));
        const meta = STATUS_META[status];
        const recv = result.used.find((u) => u.site.id === w.id);
        const active = focusId === w.id || selectedId === w.id;
        const hollow = isSrc && isAfter; // source ward after the change: shown as an empty outline
        const detail = recv && isAfter
          ? `+${formatInt(recv.total)} patients/yr, occupancy ${Math.round(w.occ * 100)}% to ${Math.round(recv.occAfter * 100)}%`
          : `${w.beds} beds, occupancy ${Math.round(w.occ * 100)}%`;
        // Labels on the left half sit to the left of the node, so they never run off the map
        const left = x > W * 0.7;
        return (
          <g key={w.id} role="button" tabIndex={0} aria-pressed={selectedId === w.id}
            aria-label={`${w.short}: ${meta.label}. ${detail}${isSrc ? ". Ward under decision" : ""}`}
            className={`cursor-pointer ${FOCUS}`}
            onMouseEnter={() => onFocus(w.id)} onFocus={() => onFocus(w.id)} onBlur={() => onFocus(null)}
            onClick={() => onSelect(w.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(w.id); } }}>
            {/* generous invisible hit area for touch */}
            <circle cx={x} cy={y} r={Math.max(r + 8, 18)} fill="transparent" />
            {active && <circle cx={x} cy={y} r={r + 5} fill="none" stroke="#8dbfff" strokeWidth={2.5} />}
            {hollow ? (
              <circle cx={x} cy={y} r={r} fill="#fff" stroke="#04070d" strokeWidth={2} strokeDasharray={closed ? undefined : "4 3"} />
            ) : (
              <circle cx={x} cy={y} r={r} fill={meta.fill} fillOpacity={0.95} stroke="#fff" strokeWidth={1.5} style={{ transition: "fill .6s ease" }} />
            )}
            {/* glyph inside the node: status is readable without colour */}
            {!hollow && r >= 9 && <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" pointerEvents="none">{meta.glyph}</text>}
            {hollow && closed && (
              <path d={`M${x - r * 0.5},${y - r * 0.5} L${x + r * 0.5},${y + r * 0.5} M${x + r * 0.5},${y - r * 0.5} L${x - r * 0.5},${y + r * 0.5}`} stroke="#e5484d" strokeWidth={2.5} strokeLinecap="round" />
            )}
            <text x={left ? x - r - 6 : x + r + 6} y={y + 4} textAnchor={left ? "end" : "start"} fontSize={compact ? 11 : 12} fontWeight={600} fill="#ffffff" pointerEvents="none"
              style={{ paintOrder: "stroke", stroke: "#04070d", strokeWidth: 3.5 }}>
              {w.short}
            </text>
            {/* the one extra line of detail appears only for the focused ward */}
            {active && !compact && (
              <text x={left ? x - r - 6 : x + r + 6} y={y + 19} textAnchor={left ? "end" : "start"} fontSize={10.5} fill="#c9d3e3" pointerEvents="none"
                style={{ paintOrder: "stroke", stroke: "#04070d", strokeWidth: 3.5 }}>
                {recv && isAfter ? `+${formatInt(recv.total)} → ${Math.round(recv.occAfter * 100)}%` : `${Math.round(occOf(w) * 100)}%`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
