"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { INPUT } from "@/components/flow/fields";
import { DATASETS, DATASET_BY_ID, checkCsv, templateCsv, type CheckResult, type DatasetId } from "@/lib/hospital/datasets";
import { DEPARTMENTS } from "@/lib/hospital/departments";
import { PERIOD_LABEL } from "@/lib/hospital/period";
import { actions, type HospitalState } from "@/lib/hospital/store";
import { NAV } from "@/components/layout/TopNav";
import { PageShell, RequireProfile, formatDate } from "../shell";

const PAGE_HREF = Object.fromEntries(NAV.map((n) => [n.label, n.href]));

/**
 * One Upload page for all data: pick the dataset, download the empty template, upload the CSV,
 * look at the preview and read the check in plain words. Saving replaces that dataset for this hospital.
 */
export function Upload({ initial }: { initial?: DatasetId }) {
  return (
    <PageShell title="Upload" icon="upload" intro={<>Every number is uploaded once, here, and the other pages only display it. All data covers one period: <b className="text-ink">{PERIOD_LABEL}</b>, and one list of departments.</>}>
      <RequireProfile>{(s) => <UploadFlow s={s} initial={initial} />}</RequireProfile>
    </PageShell>
  );
}

function UploadFlow({ s, initial }: { s: HospitalState; initial?: DatasetId }) {
  const [id, setId] = useState<DatasetId>(initial && DATASET_BY_ID[initial] ? initial : "patients");
  const [file, setFile] = useState<{ name: string; result: CheckResult } | null>(null);
  const [by, setBy] = useState("");
  const [saved, setSaved] = useState<DatasetId | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const def = DATASET_BY_ID[id];
  const current = s.data[id];

  const choose = (d: DatasetId) => { setId(d); setFile(null); setSaved(null); if (input.current) input.current.value = ""; };
  const read = async (f: File) => {
    setSaved(null);
    const text = await f.text();
    setFile({ name: f.name, result: checkCsv(id, text) });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([templateCsv(id)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `template-${id}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = () => {
    if (!file || file.result.errors.length) return;
    actions.saveUpload(id, { rows: file.result.rows, suppliedBy: by.trim() || def.owner, uploadedAt: new Date().toISOString().slice(0, 10), fileName: file.name });
    setSaved(id); setFile(null); if (input.current) input.current.value = "";
  };

  const r = file?.result;
  return (
    <div className="space-y-5">
      {/* 1. Pick the dataset */}
      <Card title="1 · Pick the dataset">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Dataset">
          {DATASETS.map((d) => {
            const u = s.data[d.id];
            const on = d.id === id;
            return (
              <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => choose(d.id)}
                className={`rounded-xl border p-3.5 text-left focus-visible:outline-2 focus-visible:outline-brand-500 ${on ? "border-brand-400 bg-brand-500/15" : "border-line bg-panel hover:border-brand-200"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{d.title}</span>
                  {u ? <Icon name="check" className="h-4 w-4 text-par" title="Uploaded" /> : <span className="text-[10px] font-semibold uppercase tracking-wide text-watch">missing</span>}
                </div>
                <div className="mt-1 text-xs text-muted">{d.owner}</div>
                <div className="mt-1.5 text-xs">{u ? <span className="text-ink/80">{s.profile?.demo && !s.uploaded[d.id] ? "Demo data" : `${u.suppliedBy}, ${formatDate(u.uploadedAt)}`}</span> : <span className="text-muted">Not uploaded yet</span>}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* 2. Template */}
        <Card title="2 · Download the empty template" subtitle={def.description}>
          <table className="mb-4 w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="pb-1.5 font-medium">Column</th><th className="pb-1.5 font-medium">What to enter</th></tr></thead>
            <tbody>
              {def.columns.map((c) => (
                <tr key={c.key} className="border-t border-line"><td className="py-1.5 pr-3"><code className="rounded bg-brand-50 px-1 text-xs">{c.key}</code></td><td className="py-1.5 text-ink/80">{c.label} · <span className="text-muted">{c.hint}</span></td></tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={download} className="flex items-center gap-2 rounded-xl border border-brand-200 bg-panel px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100">
            <Icon name="download" className="h-4 w-4" /> template-{id}.csv
          </button>
          <p className="mt-2 text-xs text-muted">
            {def.grain === "month-ward" ? `Months and wards are already filled in (${DEPARTMENTS.length} wards × 12 months); type only the numbers. ` : def.grain === "ward" ? `All ${DEPARTMENTS.length} wards are listed; delete the rows of wards your hospital does not have. ` : def.grain === "month" ? "The 12 months are already filled in. " : ""}
            Wards: {DEPARTMENTS.map((d) => d.code).join(", ")}.
          </p>
        </Card>

        {/* 3. Upload */}
        <Card title="3 · Upload your CSV file" subtitle={current ? "Uploading replaces the data that is there now." : undefined}>
          <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) read(f); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm ${drag ? "border-brand-400 bg-brand-500/15" : "border-line bg-panel hover:border-brand-200"}`}>
            <Icon name="upload" className="h-7 w-7 text-brand-600" />
            <span><b>Choose a file</b> or drop it here</span>
            <span className="text-xs text-muted">CSV with commas, first row = column names</span>
            <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); }} />
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium">Supplied by</span>
            <input className={INPUT} value={by} onChange={(e) => setBy(e.target.value)} placeholder={`e.g. ${def.owner} · name`} />
            <span className="mt-1 block text-xs text-muted">Shown next to the data on every page, with today’s date.</span>
          </label>
          {saved && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-par/40 solid-par p-3 text-sm text-par">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{DATASET_BY_ID[saved].title} saved. It now shows on {DATASET_BY_ID[saved].usedOn.map((p, i) => <span key={p}>{i ? ", " : ""}{PAGE_HREF[p] ? <Link className="underline" href={PAGE_HREF[p]}>{p}</Link> : p}</span>)}.</span>
            </p>
          )}
          {s.uploaded[id] && !file && (
            <button type="button" onClick={() => { actions.removeUpload(id); setSaved(null); }} className="mt-3 text-xs font-medium text-muted underline hover:text-gap">
              Remove my upload{s.profile?.demo ? " (go back to demo data)" : ""}
            </button>
          )}
        </Card>
      </div>

      {/* 4–5. Preview and check */}
      {r && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card title="4 · Preview" subtitle={`${file!.name} · ${r.raw.length} row${r.raw.length === 1 ? "" : "s"}${r.raw.length > 12 ? " · first 12 shown" : ""}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-muted">{r.header.map((h, i) => <th key={i} className="whitespace-nowrap pb-1.5 pr-3 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {r.raw.slice(0, 12).map((row, i) => (
                    <tr key={i} className="border-t border-line">{r.header.map((_, j) => <td key={j} className="whitespace-nowrap py-1 pr-3 tabular-nums">{row[j]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="5 · Check">
            {r.errors.length ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-semibold text-gap"><Icon name="alert" className="h-5 w-5" /> {r.errors.length === 1 ? "One thing to fix" : "Some things to fix"} before saving</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink/85">{r.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            ) : (
              <p className="flex items-center gap-2 font-semibold text-par"><Icon name="check" className="h-5 w-5" /> All good: {r.rows.length} row{r.rows.length === 1 ? "" : "s"} ready to save.</p>
            )}
            {r.warnings.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-watch">{r.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={r.errors.length > 0} className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">Save to {s.profile?.name}</button>
              <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} className="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:bg-white/10">Cancel</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
