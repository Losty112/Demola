"use client";
import type { ReactNode } from "react";

export const INPUT = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500";

/** Labelled number/text input with an optional hint line (unit, benchmark). */
export function FormField({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Numbered 1-2-3 progress bar shown above every stage of the flow. */
export function Stepper({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {labels.map((l, i) => {
        const state = i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li key={l} className="flex items-center gap-2" aria-current={state === "now" ? "step" : undefined}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${state === "todo" ? "bg-brand-100 text-brand-700" : "bg-brand-500 text-white"}`}>{state === "done" ? "✓" : i + 1}</span>
            <span className={state === "now" ? "font-semibold text-ink" : "text-muted"}>{l}</span>
            {i < labels.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-line sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
