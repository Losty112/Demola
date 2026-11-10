"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Icon, IconCount } from "@/components/ui/Icon";
import { STATUS_META, capacityStatus } from "@/lib/closure/status";
import { formatEuro, formatEuroCompact, formatInt } from "@/lib/format";
import { OTHER_HOSPITALS } from "@/lib/hospital/others";
import type { WardView } from "@/lib/hospital/derive";
import type { Profile } from "@/lib/hospital/demo";
import { COST_SERIES, CostSplitBars } from "../charts";
import { HospitalMap, type MapPoint } from "../HospitalMap";
import { NeedsData, PageShell, RequireProfile, Supplied } from "../shell";

/** Wards: spending and beds per department, and the ward capacity of other hospitals on a map. Clicking a ward changes the view. */
export function Wards() {
  const [sel, setSel] = useState<string | null>(null);
  const [mapSel, setMapSel] = useState<string | null>(null);
  return (
    <PageShell title="Wards" icon="bed" intro="Spending and beds for each department. Click a ward to see its spending, its beds and the same ward at other hospitals.">
      <RequireProfile>
        {(s) => {
          const v = s.view;
          if (!v.has.wards) return <NeedsData needs={["wards"]} what="This page" />;
          const ward = v.wards.find((w) => w.code === sel) ?? v.wards[0];
          return (
            <>
              <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Choose a ward">
                {v.wards.map((w) => {
                  const st = w.occupancy !== null ? STATUS_META[capacityStatus(w.occupancy)] : null;
                  const on = w.code === ward.code;
                  return (
                    <button key={w.code} type="button" aria-pressed={on} onClick={() => { setSel(w.code); setMapSel(null); }}
                      className={`glass rounded-2xl border p-4 text-left shadow-card focus-visible:outline-2 focus-visible:outline-brand-500 ${on ? "border-brand-400 bg-brand-500/15" : "border-line bg-surface"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{w.name}</span>
                        {st && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${st.chip}`}>{st.glyph} {Math.round((w.occupancy ?? 0) * 100)}%</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        {w.freeBeds !== null
                          ? <><IconCount name="bed" count={w.freeBeds} max={14} label={`${formatInt(w.freeBeds)} free beds on a typical day`} /> <span>free of {w.beds}</span></>
                          : <span>{w.beds} beds</span>}
                      </div>
                      {w.cost && <div className="mt-1.5 text-xs text-muted"><Icon name="euro" className="mr-1 inline h-3.5 w-3.5" />{formatEuroCompact(w.cost.total)} in 12 months</div>}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <WardDetail w={ward} />
                <Card title={`${ward.name} at other hospitals`} subtitle="Public, anonymous capacity data · circle = beds, colour = how full">
                  <OthersMap code={ward.code} own={s.profile!} w={ward} selected={mapSel} onSelect={setMapSel} />
                </Card>
              </div>

              {v.has.costs ? (
                <Card title="Spending per ward" subtitle="12 months, split into staff, medicines, building and energy · click a bar to open the ward">
                  <CostSplitBars data={v.wards.filter((w) => w.cost).map((w) => ({ code: w.code, name: w.name, ...w.cost! }))} selected={ward.code} onSelect={(c) => { setSel(c); setMapSel(null); }} />
                </Card>
              ) : <NeedsData needs={["costs"]} what="Spending per ward" />}
              <div className="space-y-1"><Supplied id="wards" s={s} /><Supplied id="costs" s={s} /><Supplied id="patients" s={s} /></div>
            </>
          );
        }}
      </RequireProfile>
    </PageShell>
  );
}

function WardDetail({ w }: { w: WardView }) {
  const occupied = w.freeBeds !== null ? w.beds - w.freeBeds : null;
  return (
    <Card title={w.name} subtitle="Beds on a typical day and spending over 12 months">
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Beds · <span className="text-par">green = free</span>, grey = occupied</span>
            <b className="text-ink">{w.beds} beds</b>
          </div>
          {occupied !== null
            ? <IconCount name="bed" count={w.freeBeds ?? 0} empty={occupied} max={120} iconClass="h-5 w-5" label={`${formatInt(w.freeBeds ?? 0)} of ${w.beds} beds free on a typical day`} />
            : <p className="text-sm text-muted">Upload patients to see how many beds are free.</p>}
          {w.alos !== null && <p className="mt-2 text-xs text-muted">{formatInt(w.admissions ?? 0)} patients · average stay {w.alos.toFixed(1)} days</p>}
        </div>
        {w.cost ? (
          <div className="space-y-2">
            {COST_SERIES.map((c) => {
              const val = w.cost![c.key as "staff"];
              return (
                <div key={c.key}>
                  <div className="flex justify-between text-xs"><span className="text-muted">{c.label}</span><b className="tabular-nums">{formatEuro(val)}</b></div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(val / w.cost!.total) * 100}%`, background: c.color }} /></div>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-line pt-2 text-sm"><span>Total</span><b>{formatEuro(w.cost.total)}</b></div>
            {w.costPerPatient && <p className="text-xs text-muted">{formatEuro(w.costPerPatient)} per patient · {formatEuro(w.cost.total / Math.max(1, w.beds))} per bed</p>}
          </div>
        ) : <p className="text-sm text-muted">Upload spending to see what this ward costs.</p>}
      </div>
    </Card>
  );
}

/** Same department at other hospitals; your hospital is drawn with a star when its location is known. */
function OthersMap({ code, own, w, selected, onSelect }: { code: string; own: Profile; w: WardView; selected: string | null; onSelect: (id: string | null) => void }) {
  const points: MapPoint[] = OTHER_HOSPITALS.map((h) => {
    const x = h.wards.find((y) => y.code === code);
    return {
      id: h.id, label: h.label, short: h.label.slice(-1), lat: h.lat, lon: h.lon, size: x?.beds ?? 0,
      color: x ? STATUS_META[capacityStatus(x.occ)].fill : "#000",
      detail: x ? `${x.beds} beds · ${Math.round(x.occ * 100)}% full · ${h.district}` : `no ${w.name.toLowerCase()} ward`,
    };
  });
  if (own.lat !== undefined && own.lon !== undefined) {
    points.push({ id: "own", label: "Your hospital", lat: own.lat, lon: own.lon, size: w.beds, own: true,
      color: w.occupancy !== null ? STATUS_META[capacityStatus(w.occupancy)].fill : "#2b7de9",
      detail: `${w.beds} beds${w.occupancy !== null ? ` · ${Math.round(w.occupancy * 100)}% full` : ""}` });
  }
  const pick = OTHER_HOSPITALS.find((h) => h.id === selected);
  const pickWard = pick?.wards.find((y) => y.code === code);
  const withWard = OTHER_HOSPITALS.filter((h) => h.wards.some((y) => y.code === code));
  const otherBeds = withWard.reduce((a, h) => a + (h.wards.find((y) => y.code === code)?.beds ?? 0), 0);
  return (
    <div className="space-y-3">
      <HospitalMap points={points} selectedId={selected} onSelect={onSelect} title={`${w.name} capacity at other hospitals`} />
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {(["ok", "warn", "critical"] as const).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[k].dot}`} />{STATUS_META[k].label}</span>)}
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-muted" />no such ward</span>
      </div>
      <p className="text-sm text-ink/80">
        {pick
          ? <><b>{pick.label}</b> ({pick.kind}, {pick.district}): {pickWard ? `${pickWard.beds} ${w.name.toLowerCase()} beds, on average ${Math.round(pickWard.occ * 100)}% full.` : `has no ${w.name.toLowerCase()} ward.`}</>
          : <>{withWard.length} of {OTHER_HOSPITALS.length} other hospitals have this ward, {formatInt(otherBeds)} beds in total. Click a hospital for its figures.</>}
      </p>
    </div>
  );
}
