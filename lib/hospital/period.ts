/**
 * THE reporting period: one fixed 12-month window used by every page and every upload template.
 * Monthly data must fall inside it; yearly figures (costs, staff) are totals for it.
 */
export const PERIOD_MONTHS: string[] = [
  "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04",
  "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
];

export const PERIOD_LABEL = "Nov 2025 – Oct 2026";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-01" -> "Jan 26" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`;
}

/** "2026-01" -> "Jan 2026" (fixed names: the browser would write "Sept" for September) */
export function monthYearLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2026-11-03" or "2026-11-03T10:00:00Z" -> "3 Nov 2026"; anything else is returned unchanged. */
export function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** Calendar month index 0..11 of "2026-01" (for seasonal profiles). */
export const monthIndex = (month: string) => Number(month.slice(5, 7)) - 1;

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const DAYS_IN_PERIOD = PERIOD_MONTHS.reduce((s, m) => s + daysInMonth(m), 0);

/** Accepts "2026-01", "2026-1", "01/2026", "1/2026" and "2026-01-15"; returns "2026-01" or null. */
export function normaliseMonth(input: string): string | null {
  const v = input.trim();
  let m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(v);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = /^(\d{1,2})[/.](\d{4})$/.exec(v);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return null;
}
