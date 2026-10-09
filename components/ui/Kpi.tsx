export function Kpi({ label, value, hint, tone = "brand" }: { label: string; value: string; hint?: string; tone?: "brand" | "good" | "warn" | "bad" }) {
  const color = { brand: "text-brand-600", good: "text-par", warn: "text-watch", bad: "text-gap" }[tone];
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-b from-white to-brand-50/60 p-4 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1.5 text-3xl font-semibold tracking-tight ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
