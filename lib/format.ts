const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const formatInt = (v: number) => int.format(Math.round(v));
export const formatEuro = (v: number) => `€${int.format(Math.round(v))}`;
export const formatEuroCompact = (v: number) => `€${compact.format(v)}`;
export const formatCompact = (v: number) => compact.format(v);

/** "2026-Q3" -> "Q3 2026" */
export function formatPeriod(p: string): string {
  const m = /^(\d{4})-Q(\d)$/.exec(p);
  return m ? `Q${m[2]} ${m[1]}` : p;
}
