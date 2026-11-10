"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { BackgroundVideo } from "@/components/flow/BackgroundVideo";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { DATASET_BY_ID, type DatasetId } from "@/lib/hospital/datasets";
import { PERIOD_LABEL, dateLabel } from "@/lib/hospital/period";
import { actions, useHospital, type HospitalState } from "@/lib/hospital/store";
import { INPUT } from "@/components/flow/fields";

/** Frame of every inner page: dimmed background, title, the hospital and period it is about. */
export function PageShell({ title, intro, icon, badge, children }: { title: string; intro?: ReactNode; icon?: IconName; badge?: ReactNode; children: ReactNode }) {
  const { profile } = useHospital();
  return (
    <>
      <BackgroundVideo dim="reading" />
      <div className="mx-auto w-full max-w-[1320px] space-y-6 px-4 pb-20 pt-32 sm:px-6 xl:pt-24">
        <header className="fade-in flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display flex items-center gap-3 text-4xl tracking-wide text-ink sm:text-5xl">
              {icon && <Icon name={icon} className="h-8 w-8 text-brand-600 sm:h-10 sm:w-10" />}
              {title}
              {badge}
            </h1>
            {intro && <p className="mt-1 max-w-3xl text-sm text-muted">{intro}</p>}
          </div>
          {profile && (
            <div className="text-right text-xs text-muted">
              <div className="font-semibold text-ink">{profile.name}</div>
              <div>{PERIOD_LABEL}</div>
            </div>
          )}
        </header>
        <div className="rise space-y-6">{children}</div>
      </div>
    </>
  );
}

export function UnderConstruction() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-watch/50 bg-watch/15 px-3 py-1 font-sans text-xs font-semibold normal-case tracking-normal text-watch">
      <Icon name="cone" className="h-4 w-4" /> Under construction
    </span>
  );
}

/** Pages about one hospital need a profile. Without one: open the demo hospital or create your own. */
export function RequireProfile({ children }: { children: (s: HospitalState) => ReactNode }) {
  const s = useHospital();
  if (!s.ready) return <div className="h-64 animate-pulse rounded-2xl border border-line bg-surface" aria-busy="true" aria-label="Loading" />;
  if (!s.profile) return <ChooseProfile />;
  return <>{children(s)}</>;
}

export function ChooseProfile() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card title="Open the demo hospital" subtitle="An invented hospital with every dataset filled in. Nothing to upload.">
        <button type="button" onClick={() => actions.signInDemo()}
          className="flex items-center gap-2 rounded-xl bg-par px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110">
          <Icon name="hospital" /> Log in as demo hospital
        </button>
      </Card>
      <Card title="Set up my hospital" subtitle="Creates a profile for your hospital in this browser. Then upload your data on the Upload page.">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (name.trim()) actions.createProfile(name, city); }}>
          <label className="block text-sm"><span className="mb-1 block font-medium">Hospital name</span><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="organization" /></label>
          <label className="block text-sm"><span className="mb-1 block font-medium">Town or district <span className="font-normal text-muted">(optional)</span></span><input className={INPUT} value={city} onChange={(e) => setCity(e.target.value)} /></label>
          <button type="submit" disabled={!name.trim()} className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">Create profile</button>
        </form>
      </Card>
    </div>
  );
}

/** Shown in place of a section whose data has not been uploaded yet. */
export function NeedsData({ needs, what }: { needs: DatasetId[]; what: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-surface p-6 text-sm">
      <div className="flex items-start gap-3">
        <Icon name="upload" className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
        <div>
          <p className="font-semibold text-ink">{what} needs data that is not uploaded yet.</p>
          <p className="mt-1 text-muted">Upload {needs.map((d) => DATASET_BY_ID[d].title.toLowerCase()).join(" and ")} once — every page that uses it will show it.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {needs.map((d) => (
              <Link key={d} href={`/upload?dataset=${d}`} className="rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">Upload {DATASET_BY_ID[d].title.toLowerCase()}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Supplied by … on …" line for a dataset. */
export function Supplied({ id, s }: { id: DatasetId; s: HospitalState }) {
  const u = s.data[id];
  if (!u) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <Icon name="check" className="h-3.5 w-3.5 text-par" />
      <span>{DATASET_BY_ID[id].title}: supplied by <b className="font-medium text-ink">{u.suppliedBy || "unknown"}</b> on {formatDate(u.uploadedAt)}</span>
      {s.profile?.demo && !s.uploaded[id] && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">demo data</span>}
    </p>
  );
}

export const formatDate = dateLabel;

/** Big figure with an icon instead of a bare number in a table. */
export function Figure({ icon, label, value, hint, tone = "brand" }: { icon: IconName; label: string; value: string; hint?: ReactNode; tone?: "brand" | "good" | "warn" | "bad" }) {
  const color = { brand: "text-brand-600", good: "text-par", warn: "text-watch", bad: "text-gap" }[tone];
  return (
    <div className="glass flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 ${color}`}><Icon name={icon} className="h-6 w-6" /></span>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
        <div className={`font-display text-3xl leading-tight ${color}`}>{value}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
    </div>
  );
}
