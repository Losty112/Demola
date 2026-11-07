"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconCount } from "@/components/ui/Icon";
import { formatEuro, formatEuroCompact, formatInt } from "@/lib/format";
import { OTHER_HOSPITALS, openPostsOf } from "@/lib/hospital/others";
import { DEPARTMENT_BY_CODE } from "@/lib/hospital/departments";
import { HospitalMap, type MapPoint } from "../HospitalMap";
import { Figure, NeedsData, PageShell, RequireProfile, Supplied } from "../shell";

/** Open-post share → colour (same thresholds as the pressure overview). */
const openTone = (s: number) => (s >= 0.08 ? { fill: "#e5484d", label: "Many open posts", cls: "text-gap" } : s >= 0.04 ? { fill: "#e8920f", label: "Some open posts", cls: "text-watch" } : { fill: "#12a37a", label: "Few open posts", cls: "text-par" });
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Doctors and staff: doctors, nurses, open posts and cost per ward, and the staff situation at other hospitals. */
export function Staff() {
  const [ward, setWard] = useState<string | null>(null);
  const [mapSel, setMapSel] = useState<string | null>(null);
  return (
    <PageShell title="Doctors & staff" icon="doctor" intro="Doctors, nurses, open posts and staff cost for each ward. Staff cost comes from the spending upload, so it is entered only once.">
      <RequireProfile>
        {(s) => {
          const v = s.view;
          if (!v.has.staff) return <NeedsData needs={["staff"]} what="This page" />;
          const t = v.totals;
          const share = t.openShare ?? 0;
          const staffCost = t.cost?.staff ?? null;
          return (
            <>
              <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Figure icon="doctor" label="Doctors" value={formatInt(t.doctors ?? 0)} hint="FTE, filled posts" />
                <Figure icon="nurse" label="Nurses" value={formatInt(t.nurses ?? 0)} hint="FTE, filled posts" />
                <Figure icon="alert" label="Open posts" value={formatInt(t.openPosts ?? 0)} hint={`${pct(share)} of all posts`} tone={share >= 0.08 ? "bad" : share >= 0.04 ? "warn" : "good"} />
                <Figure icon="euro" label="Staff cost" value={staffCost !== null ? formatEuroCompact(staffCost) : "—"} hint={staffCost !== null && t.doctors !== null && t.nurses !== null ? `${formatEuro(staffCost / (t.doctors + t.nurses))} per FTE` : "needs spending data"} />
              </div>

              <Card title="By ward" subtitle="Each figure is one person (FTE). Faded figures are open posts. Click a ward to show it on the map.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="text-left text-xs text-muted">
                      {["Ward", "Doctors", "Nurses", "Open posts", "Staff cost"].map((h) => <th key={h} scope="col" className="pb-2 pr-3 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {v.wards.map((w) => {
                        const tone = openTone(w.openShare ?? 0);
                        const on = ward === w.code;
                        return (
                          <tr key={w.code} onClick={() => { setWard(on ? null : w.code); setMapSel(null); }} className={`cursor-pointer border-t border-line align-top ${on ? "bg-brand-500/15" : ""}`}>
                            <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                              <button type="button" aria-pressed={on} className="text-left hover:underline" onClick={(e) => { e.stopPropagation(); setWard(on ? null : w.code); setMapSel(null); }}>{w.name}</button>
                            </th>
                            <td className="py-2.5 pr-3"><IconCount name="doctor" count={w.doctors ?? 0} empty={w.openDoctor ?? 0} max={22} className="text-brand-600" label={`${formatInt(w.doctors ?? 0)} doctors, ${w.openDoctor ?? 0} open posts`} /></td>
                            <td className="py-2.5 pr-3 whitespace-nowrap"><span className="font-semibold tabular-nums">{formatInt(w.nurses ?? 0)}</span> <span className="text-xs text-muted">FTE</span></td>
                            <td className="py-2.5 pr-3">
                              <span className={`font-semibold ${tone.cls}`}>{(w.openDoctor ?? 0) + (w.openNurse ?? 0)}</span>
                              <span className="text-xs text-muted"> · {w.openDoctor} doctors, {w.openNurse} nurses · {pct(w.openShare ?? 0)}</span>
                            </td>
                            <td className="py-2.5 tabular-nums">{w.cost ? formatEuro(w.cost.staff) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <StaffMap ward={ward} selected={mapSel} onSelect={setMapSel} own={{ share, lat: s.profile?.lat, lon: s.profile?.lon, wardShare: v.wards.find((w) => w.code === ward)?.openShare ?? null }} />
              <div className="space-y-1"><Supplied id="staff" s={s} /><Supplied id="costs" s={s} /></div>
            </>
          );
        }}
      </RequireProfile>
    </PageShell>
  );
}

function StaffMap({ ward, selected, onSelect, own }: { ward: string | null; selected: string | null; onSelect: (id: string | null) => void; own: { share: number; wardShare: number | null; lat?: number; lon?: number } }) {
  const name = ward ? DEPARTMENT_BY_CODE[ward]?.name ?? ward : null;
  const points: MapPoint[] = OTHER_HOSPITALS.map((h) => {
    const s = openPostsOf(h, ward ?? undefined);
    const beds = h.wards.filter((w) => !ward || w.code === ward).reduce((a, w) => a + w.beds, 0);
    return { id: h.id, label: h.label, short: h.label.slice(-1), lat: h.lat, lon: h.lon, size: s === null ? 0 : beds, color: s === null ? "#000" : openTone(s).fill, detail: s === null ? `no ${name?.toLowerCase()} ward` : `${pct(s)} posts open · ${h.district}` };
  });
  const ownShare = ward ? own.wardShare : own.share;
  if (own.lat !== undefined && own.lon !== undefined && ownShare !== null) {
    points.push({ id: "own", label: "Your hospital", lat: own.lat, lon: own.lon, size: Math.max(...points.map((p) => p.size)) * 0.6, own: true, color: openTone(ownShare).fill, detail: `${pct(ownShare)} posts open` });
  }
  const pick = OTHER_HOSPITALS.find((h) => h.id === selected);
  const pickShare = pick ? openPostsOf(pick, ward ?? undefined) : null;
  const pickStaff = pick ? pick.wards.filter((w) => !ward || w.code === ward) : [];
  return (
    <Card title={`Staff situation at other hospitals${name ? ` · ${name}` : ""}`} subtitle="Public, anonymous data · colour = share of open posts, circle = beds">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <HospitalMap points={points} selectedId={selected} onSelect={onSelect} title="Open posts at other hospitals" />
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            {[0.02, 0.05, 0.1].map((x) => { const t = openTone(x); return <span key={x} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.fill }} />{t.label}</span>; })}
          </div>
          {pick ? (
            <div className="rounded-xl border border-line bg-panel p-4">
              <div className="font-semibold">{pick.label}</div>
              <div className="text-xs text-muted">{pick.kind} · {pick.district}</div>
              {pickShare === null ? <p className="mt-2 text-ink/80">No {name?.toLowerCase()} ward.</p> : (
                <ul className="mt-2 space-y-1 text-ink/80">
                  <li>Open posts: <b className={openTone(pickShare).cls}>{pct(pickShare)}</b></li>
                  <li>Staff per 10 beds: <b>{(pickStaff.reduce((a, w) => a + w.staffPer10Beds * w.beds, 0) / Math.max(1, pickStaff.reduce((a, w) => a + w.beds, 0))).toFixed(1)}</b></li>
                </ul>
              )}
            </div>
          ) : <p className="text-ink/80">Click a hospital on the map for its figures. {ward ? "Click the ward again in the table to see whole hospitals." : "Click a ward in the table to compare just that ward."}</p>}
          {ownShare !== null && <p className="text-xs text-muted">Your hospital{name ? ` (${name})` : ""}: <b className={openTone(ownShare).cls}>{pct(ownShare)}</b> of posts open.</p>}
        </div>
      </div>
    </Card>
  );
}
