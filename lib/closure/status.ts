/**
 * Capacity status of a ward — one standard colour code used everywhere
 * (map, KPI cards, tables, bars). Thresholds follow the consultation feedback.
 *
 *   green  / "ok"       under capacity    occupancy < 85 %
 *   yellow / "warn"     near capacity     85 % <= occupancy < 95 %
 *   red    / "critical" over capacity     occupancy >= 95 %  (critical bottleneck)
 */
export type CapacityStatus = "ok" | "warn" | "critical";

export const WARN_AT = 0.85;
export const CRITICAL_AT = 0.95;

export const capacityStatus = (occ: number): CapacityStatus =>
  occ >= CRITICAL_AT ? "critical" : occ >= WARN_AT ? "warn" : "ok";

/** Colour is never the only signal: every status also has a label and a glyph. */
export const STATUS_META: Record<CapacityStatus, { label: string; short: string; glyph: string; fill: string; chip: string; dot: string }> = {
  ok: { label: "Under capacity", short: "OK", glyph: "✓", fill: "#12a37a", chip: "bg-par/10 text-par ring-par/25", dot: "bg-par" },
  warn: { label: "Near capacity", short: "Warning", glyph: "!", fill: "#e8920f", chip: "bg-watch/10 text-watch ring-watch/30", dot: "bg-watch" },
  critical: { label: "Over capacity", short: "Critical", glyph: "✕", fill: "#e5484d", chip: "bg-gap/10 text-gap ring-gap/25", dot: "bg-gap" },
};
