"use client";
import type { ReactNode } from "react";
import { STATUS_META, type CapacityStatus } from "@/lib/closure/status";

/** Shared focus style so every interactive element has a visible keyboard focus. */
export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

/** Status pill: colour + glyph + text (never colour alone). */
export function StatusBadge({ status, label }: { status: CapacityStatus; label?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${m.chip}`}>
      <span aria-hidden="true">{m.glyph}</span>
      {label ?? m.label}
    </span>
  );
}

/** Legend explaining the three capacity colours. Shown next to every map. */
export function CapacityLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Capacity colour code">
      {(["ok", "warn", "critical"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} aria-hidden="true" />
          <span className="font-medium text-ink">{STATUS_META[s].label}</span>
          <span>{s === "ok" ? "< 85 %" : s === "warn" ? "85–94 %" : "≥ 95 %"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Segmented control (single choice). Buttons carry aria-pressed. */
export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-line bg-brand-50 text-sm font-semibold">
      {options.map((o) => (
        <button
          key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 transition-colors ${FOCUS} ${value === o.value ? "bg-brand-500 text-white" : "text-brand-700 hover:bg-brand-100"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Form field with a visible label and optional current value. */
export function Field({ label, value, children }: { label: string; value?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between gap-2 text-muted">
        <span>{label}</span>
        {value && <strong className="text-ink">{value}</strong>}
      </span>
      {children}
    </label>
  );
}
export const INPUT = `w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink ${FOCUS}`;

/** Numbered step header used to give the page its Baseline → Selection → Impact → Plan logic. */
export function StepHeader({ n, id, title, subtitle }: { n: number; id: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">{n}</span>
      <div>
        <h3 id={id} className="font-display text-3xl tracking-wide text-ink">{title}</h3>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
