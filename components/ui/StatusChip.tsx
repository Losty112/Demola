import type { StatusKey, VerdictKey } from "@/lib/domain/types";

const STATUS: Record<StatusKey, { label: string; cls: string }> = {
  par: { label: "On par", cls: "bg-par/10 text-par ring-par/25" },
  watch: { label: "Watch", cls: "bg-watch/10 text-watch ring-watch/30" },
  gap: { label: "Gap", cls: "bg-gap/10 text-gap ring-gap/25" },
};
const VERDICT: Record<VerdictKey, { label: string; cls: string }> = {
  good: { label: "Good", cls: STATUS.par.cls },
  improve: { label: "Improve", cls: STATUS.watch.cls },
  restructure: { label: "Restructure", cls: "bg-watch/15 text-watch ring-watch/40" },
  close: { label: "Close / merge", cls: STATUS.gap.cls },
};

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap";
export const StatusChip = ({ status }: { status: StatusKey }) => <span className={`${base} ${STATUS[status].cls}`}>{STATUS[status].label}</span>;
export const VerdictChip = ({ verdict }: { verdict: VerdictKey }) => <span className={`${base} ${VERDICT[verdict].cls}`}>{VERDICT[verdict].label}</span>;

export const STATUS_COLOR: Record<StatusKey, string> = { par: "#12a37a", watch: "#e8920f", gap: "#e5484d" };
