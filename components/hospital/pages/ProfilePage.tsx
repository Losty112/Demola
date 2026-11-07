"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { DATASETS } from "@/lib/hospital/datasets";
import { actions, useHospital } from "@/lib/hospital/store";
import { ChooseProfile, PageShell, formatDate } from "../shell";

/** Each hospital has its own profile: who you are signed in as, its data, and switching between profiles. */
export function ProfilePage() {
  const s = useHospital();
  const p = s.profile;
  return (
    <PageShell title="Hospital profile" icon="user" intro="Each hospital has its own profile with its own data. In this prototype profiles live in this browser only.">
      {!s.ready ? null : !p ? <ChooseProfile /> : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card title={p.name} subtitle={`${p.city || "No location set"}${p.demo ? " · demo hospital" : ""} · profile since ${formatDate(p.createdAt)}`}
            action={<button type="button" onClick={() => actions.signOut()} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-line hover:bg-white/10">Log out</button>}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Data</h3>
            <ul className="divide-y divide-line text-sm">
              {DATASETS.map((d) => {
                const u = s.data[d.id];
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex items-center gap-2">{u ? <Icon name="check" className="h-4 w-4 text-par" /> : <Icon name="alert" className="h-4 w-4 text-watch" />}{d.title}</span>
                    <span className="text-right text-xs text-muted">
                      {u ? (p.demo && !s.uploaded[d.id] ? "demo data" : `${u.suppliedBy} · ${formatDate(u.uploadedAt)}`) : <Link href={`/upload?dataset=${d.id}`} className="font-medium text-brand-600 underline">Upload</Link>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link href="/hospital" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"><Icon name="hospital" className="h-4 w-4" /> Open my hospital</Link>
          </Card>
          <Card title="Switch hospital">
            <ul className="space-y-2">
              {s.profiles.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{x.name}</span><span className="text-xs text-muted">{x.demo ? "Demo hospital" : x.city || "Own profile"}</span></span>
                  <span className="flex shrink-0 gap-1.5">
                    {x.id === p.id ? <span className="text-xs font-semibold text-par">signed in</span>
                      : <button type="button" onClick={() => actions.signIn(x.id)} className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600">Switch</button>}
                    {!x.demo && <button type="button" onClick={() => { if (confirm(`Delete the profile “${x.name}” and its uploaded data from this browser?`)) actions.deleteProfile(x.id); }} className="rounded-lg px-2 py-1 text-xs text-muted hover:text-gap">Delete</button>}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => actions.signOut()} className="mt-3 text-xs font-medium text-brand-600 underline">Set up another hospital</button>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
