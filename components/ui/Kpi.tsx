"use client";
import { AnimatedValue } from "@/components/flow/AnimatedValue";

export function Kpi({ label, value, hint, tone = "brand" }: { label: string; value: string; hint?: string; tone?: "brand" | "good" | "warn" | "bad" }) {
  const color = { brand: "text-brand-600", good: "text-par", warn: "text-watch", bad: "text-gap" }[tone];
  return (
    <div className="glass rounded-2xl border border-line bg-gradient-to-b from-[#131c2b] to-[#0a0f18] p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1.5 font-display text-4xl leading-none whitespace-nowrap ${color}`}><AnimatedValue text={value} /></div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
