"use client";
import type { ScenarioResult, Ward } from "@/lib/closure/types";
import { STATUS_META, capacityStatus } from "@/lib/closure/status";
import { formatInt } from "@/lib/format";
import { FOCUS, StatusBadge } from "./ui";
import type { MapView } from "./NetworkMap";

/** Occupancy bar: grey tick = before, coloured fill = shown state, red line = occupancy cap. */
function OccupancyBar({ before, shown, cap, showBefore }: { before: number; shown: number; cap: number; showBefore: boolean }) {
  const status = capacityStatus(shown);
  return (
    <div className="relative h-2.5 w-full rounded-full bg-brand-100" role="img"
      aria-label={`Occupancy ${showBefore ? `${Math.round(before * 100)}% before, ` : ""}${Math.round(shown * 100)}% ${showBefore ? "after" : "today"}, cap ${Math.round(cap * 100)}%`}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, shown * 100)}%`, background: STATUS_META[status].fill }} />
      {showBefore && <div className="absolute -top-0.5 h-3.5 w-0.5 bg-ink/60" style={{ left: `${Math.min(100, before * 100)}%` }} aria-hidden="true" />}
      <div className="absolute -top-1 h-4.5 w-0 border-l-2 border-dashed border-gap/70" style={{ left: `${cap * 100}%`, height: "1.125rem" }} aria-hidden="true" />
    </div>
  );
}

/**
 * Step 3 drill-down. One compact row per ward; the granular numbers (travel, acute/general split,
 * free capacity, staffing) are hidden in an expandable panel – progressive disclosure.
 * The expanded row is the ward selected on the map, so list and map stay in sync.
 */
export function WardImpactList({ wards, result, view, selectedId, onSelect, onHover }: {
  wards: Ward[];
  result: ScenarioResult;
  view: MapView;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const after = view === "after";
  const cap = result.cfg.maxOcc;
  const rows = wards
    .filter((w) => w.id !== result.src.id)
    .map((w) => {
      const recv = result.used.find((u) => u.site.id === w.id);
      const occ = after ? recv?.occAfter ?? w.occ : w.occ;
      return { w, recv, occ };
    });
  // Receivers first (worst occupancy on top), then wards that are not touched
  const receiving = rows.filter((r) => r.recv).sort((a, b) => b.occ - a.occ);
  const untouched = rows.filter((r) => !r.recv).sort((a, b) => b.occ - a.occ);

  const Row = ({ w, recv, occ }: (typeof rows)[number]) => {
    const open = selectedId === w.id;
    const panelId = `ward-panel-${w.id}`;
    const status = capacityStatus(occ);
    return (
      <li className={`rounded-xl border bg-white ${open ? "border-brand-300 shadow-card" : "border-line"}`} onMouseEnter={() => onHover(w.id)} onMouseLeave={() => onHover(null)}>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => onSelect(open ? null : w.id)}
          className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3 text-left sm:grid-cols-[10rem_1fr_auto_auto] ${FOCUS}`}>
          <span className="font-semibold text-ink">{w.short}<span className="block text-xs font-normal text-muted">{w.beds} beds</span></span>
          <span className="order-last col-span-2 block sm:order-none sm:col-span-1"><OccupancyBar before={w.occ} shown={occ} cap={cap} showBefore={after && !!recv} /></span>
          <span className="text-right text-sm tabular-nums">
            {after && recv ? <><span className="text-muted">{Math.round(w.occ * 100)}% →</span> <strong>{Math.round(occ * 100)}%</strong></> : <strong>{Math.round(occ * 100)}%</strong>}
            {after && recv && <span className="block text-xs text-muted">+{formatInt(recv.total)} patients/yr</span>}
          </span>
          <span className="hidden justify-self-end sm:block"><StatusBadge status={status} /></span>
        </button>
        {open && (
          <div id={panelId} className="grid gap-x-6 gap-y-1 border-t border-line px-4 py-3 text-sm sm:grid-cols-2">
            <div className="sm:hidden"><StatusBadge status={status} /></div>
            <dl className="space-y-1">
              <Item k="Hospital" v={`${w.name} · ${w.district}`} />
              <Item k="Beds (standard + CCU)" v={`${w.beds_std} + ${w.beds_ccu}`} />
              <Item k="Cath labs" v={w.cathlabs ? String(w.cathlabs) : "none"} />
              <Item k="Free admissions below cap" v={recv ? formatInt(Math.max(0, recv.free - recv.total)) : formatInt(Math.max(0, Math.round((w.beds * 365 * (cap - w.occ)) / w.alos)))} />
            </dl>
            {recv ? (
              <dl className="space-y-1">
                <Item k={`Travel from ${result.src.short}`} v={`${recv.t} min`} />
                <Item k="Receives" v={`${formatInt(recv.acute)} acute · ${formatInt(recv.general)} general`} />
                <Item k="Extra staff needed" v={`${recv.physNeed.toFixed(1)} physicians · ${recv.nurseNeed.toFixed(1)} nurses`} />
              </dl>
            ) : (
              <p className="text-muted">{result.cfg.travelCap && (result.receivers.some((r) => r.site.id === w.id) ? "Within travel limit but not needed for this scenario." : `Further than ${result.cfg.travelCap} min from ${result.src.short}, so not used.`)}</p>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">{receiving.map((r) => <Row key={r.w.id} {...r} />)}</ul>
      {receiving.length === 0 && <p className="rounded-xl border border-line bg-white p-4 text-sm text-muted">No ward receives patients in this scenario.</p>}
      {untouched.length > 0 && (
        <details className="rounded-xl border border-line bg-white">
          <summary className={`cursor-pointer select-none rounded-xl px-4 py-3 text-sm font-medium text-brand-600 ${FOCUS}`}>
            {untouched.length} other {untouched.length === 1 ? "ward" : "wards"} not affected
          </summary>
          <ul className="space-y-2 border-t border-line p-3">{untouched.map((r) => <Row key={r.w.id} {...r} />)}</ul>
        </details>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium tabular-nums">{v}</dd></div>;
}
